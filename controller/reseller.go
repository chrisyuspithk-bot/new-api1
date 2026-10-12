package controller

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/gin-gonic/gin"
)

// ---------------------------------------------------------------------------
// B2B2C reseller management (admin-only).
//
// A reseller (RoleResellerUser) sits between the admin and its customers
// (RoleCommonUser with reseller_id pointing at the reseller). All amounts are
// in USD: a reseller top-up of $Y credits Y * QuotaPerUnit quota units (1:1).
// ---------------------------------------------------------------------------

// requireResellerPermission rejects callers who are not allowed to manage
// resellers. Only the root user may create/delete resellers; admins may manage
// the resellers' balance and pricing.
func requireResellerManager(c *gin.Context) bool {
	myRole := c.GetInt("role")
	if myRole < common.RoleAdminUser {
		common.ApiErrorT(c, "Unauthorized, insufficient privileges")
		return false
	}
	return true
}

type resellerTopUpRequest struct {
	AmountUSD float64 `json:"amount_usd" binding:"required"`
}

// ResellerTopUp credits a reseller's cost balance. $Y -> Y*QuotaPerUnit (1:1).
func ResellerTopUp(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	var req resellerTopUpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	quota, err := model.TopUpResellerCost(id, req.AmountUSD)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAuditFor(c, id, "reseller.topup", map[string]any{
		"amount_usd": req.AmountUSD,
		"quota":      quota,
	})
	common.ApiSuccessT(c, "Top-up successful", gin.H{"quota": quota})
}

type resellerDiscountRequest struct {
	Discount float64 `json:"discount" binding:"required"`
}

// ResellerSetDiscount sets a reseller's cost multiplier (admin base discount).
func ResellerSetDiscount(c *gin.Context) {
	if !requireResellerManager(c) {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	var req resellerDiscountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	if err := model.ValidateResellerMultiplier(req.Discount); err != nil {
		common.ApiErrorT(c, "Reseller discount must be greater than 0")
		return
	}
	user, err := model.GetUserById(id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user.Role != common.RoleResellerUser {
		common.ApiErrorT(c, "User is not a reseller")
		return
	}
	user.ResellerDiscount = req.Discount
	if err := user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAuditFor(c, id, "reseller.discount", map[string]any{
		"discount": req.Discount,
	})
	common.ApiSuccessT(c, "Reseller discount updated", gin.H{"discount": req.Discount})
}

type resellerMarkupRequest struct {
	Markup float64 `json:"markup" binding:"required"`
}

// ResellerSetCustomerMarkup sets the customer markup for a reseller-owned
// customer (the multiplier applied to the reseller cost).
func ResellerSetCustomerMarkup(c *gin.Context) {
	if !requireResellerManager(c) {
		return
	}
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	var req resellerMarkupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	if err := model.ValidateResellerMultiplier(req.Markup); err != nil {
		common.ApiErrorT(c, "Customer markup must be greater than 0")
		return
	}
	user, err := model.GetUserById(id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user.Role != common.RoleCommonUser || user.ResellerId == nil || *user.ResellerId <= 0 {
		common.ApiErrorT(c, "User is not a reseller-owned customer")
		return
	}
	user.CustomerMarkup = req.Markup
	if err := user.Update(false); err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAuditFor(c, id, "reseller.customer_markup", map[string]any{
		"markup": req.Markup,
	})
	common.ApiSuccessT(c, "Customer markup updated", gin.H{"markup": req.Markup})
}

// ListResellers returns paginated resellers (RoleResellerUser).
func ListResellers(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	var total int64
	if err := model.DB.Model(&model.User{}).Where("role = ?", common.RoleResellerUser).Count(&total).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	var resellers []*model.User
	if err := model.DB.Unscoped().Where("role = ?", common.RoleResellerUser).
		Omit("password", "access_token").
		Order("id desc").
		Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).
		Find(&resellers).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(resellers)
	common.ApiSuccess(c, pageInfo)
}

// ListResellerCustomers returns paginated customers (RoleCommonUser) owned by
// the given reseller.
func ListResellerCustomers(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	pageInfo := common.GetPageQuery(c)
	var total int64
	if err := model.DB.Model(&model.User{}).Where("role = ? AND reseller_id = ?", common.RoleCommonUser, id).Count(&total).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	var customers []*model.User
	if err := model.DB.Unscoped().Where("role = ? AND reseller_id = ?", common.RoleCommonUser, id).
		Omit("password", "access_token").
		Order("id desc").
		Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).
		Find(&customers).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(customers)
	common.ApiSuccess(c, pageInfo)
}

type assignCustomerRequest struct {
	ResellerId *int `json:"reseller_id"` // nil/0 unassigns the customer
}

// AssignCustomerToReseller links (or unlinks) a common user to a reseller.
func AssignCustomerToReseller(c *gin.Context) {
	if !requireResellerManager(c) {
		return
	}
	customerId, err := strconv.Atoi(c.Param("id"))
	if err != nil || customerId <= 0 {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	var req assignCustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	customer, err := model.GetUserById(customerId, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if customer.Role != common.RoleCommonUser {
		common.ApiErrorT(c, "Only common users can be assigned to a reseller")
		return
	}
	resellerId := 0
	if req.ResellerId != nil && *req.ResellerId > 0 {
		reseller, err := model.GetUserById(*req.ResellerId, false)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		if reseller.Role != common.RoleResellerUser {
			common.ApiErrorT(c, "Target user is not a reseller")
			return
		}
		resellerId = reseller.Id
	}
	update := model.User{Id: customerId}
	if resellerId > 0 {
		update.ResellerId = &resellerId
	} else {
		// Unassign: set to NULL via pointer-to-nil semantics; use a zero-value
		// pointer to NULL the column.
		var zero int
		update.ResellerId = &zero
	}
	// ResellerId is a *int pointer column; editing via Updates keeps the pointer
	// semantics while leaving the rest of the row intact.
	if err := model.DB.Model(&model.User{}).Where("id = ?", customerId).
		Update("reseller_id", update.ResellerId).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	recordManageAuditFor(c, customerId, "reseller.assign_customer", map[string]any{
		"reseller_id": resellerId,
	})
	common.ApiSuccessT(c, "Customer assignment updated", gin.H{"reseller_id": resellerId})
}

// CreateReseller creates a reseller account (root only).
func CreateReseller(c *gin.Context) {
	myRole := c.GetInt("role")
	if myRole != common.RoleRootUser {
		common.ApiErrorT(c, "Unauthorized, insufficient privileges")
		return
	}
	var user model.User
	if err := common.DecodeJson(c.Request.Body, &user); err != nil {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	user.Username = strings.TrimSpace(user.Username)
	if user.Username == "" || user.Password == "" {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	if err := common.Validate.Struct(&user); err != nil {
		common.ApiErrorT(c, "Invalid input {{error}}", map[string]any{"error": err.Error()})
		return
	}
	if user.DisplayName == "" {
		user.DisplayName = user.Username
	}
	user.Role = common.RoleResellerUser
	if user.ResellerDiscount <= 0 {
		user.ResellerDiscount = 0 // inherit shared default
	}
	cleanUser := model.User{
		Username:         user.Username,
		Password:         user.Password,
		DisplayName:      user.DisplayName,
		Role:             common.RoleResellerUser,
		ResellerDiscount: user.ResellerDiscount,
	}
	if err := cleanUser.InsertWithTx(model.DB, 0); err != nil {
		common.ApiError(c, err)
		return
	}
	cleanUser.FinishInsert(0)
	recordManageAuditFor(c, cleanUser.Id, "reseller.create", map[string]any{
		"username": cleanUser.Username,
	})
	common.ApiSuccessT(c, "Reseller created", gin.H{"id": cleanUser.Id})
}

// resellerInfoResponse exposes the reseller's spendable balance in USD.
func resellerInfoResponse(user *model.User) gin.H {
	costUSD := float64(user.ResellerCostBalance) / common.QuotaPerUnit
	return gin.H{
		"id":                    user.Id,
		"username":              user.Username,
		"display_name":          user.DisplayName,
		"reseller_cost_balance": user.ResellerCostBalance,
		"reseller_cost_usd":     costUSD,
		"reseller_discount":     user.ResellerDiscount,
		"status":                user.Status,
	}
}

// GetReseller returns a single reseller with its balance in quota and USD.
func GetReseller(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		common.ApiErrorT(c, "Invalid parameters")
		return
	}
	user, err := model.GetUserById(id, false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user.Role != common.RoleResellerUser {
		common.ApiErrorT(c, "User is not a reseller")
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    resellerInfoResponse(user),
	})
}
