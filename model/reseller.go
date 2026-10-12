package model

import (
	"errors"
	"math"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// Reseller pricing defaults. Both defaults live in the shared Option map so the
// admin can tune the global base discount / markup without per-reseller edits.
const (
	OptionKeyDefaultResellerDiscount = "DefaultResellerDiscount"
	OptionKeyDefaultCustomerMarkup   = "DefaultCustomerMarkup"
)

var (
	DefaultResellerDiscount = 1.0
	DefaultCustomerMarkup   = 1.0
)

// ErrInvalidResellerMultiplier rejects non-positive multipliers (a markup may be
// < 1 but must remain > 0).
var ErrInvalidResellerMultiplier = errors.New("reseller multiplier must be greater than 0")

// ValidateResellerMultiplier enforces the shared rule that discounts and markups
// are strictly positive (and finite).
func ValidateResellerMultiplier(m float64) error {
	if m <= 0 || math.IsNaN(m) || math.IsInf(m, 0) {
		return ErrInvalidResellerMultiplier
	}
	return nil
}

// EffectiveResellerDiscount resolves a reseller's cost multiplier, falling back
// to the shared default when the per-reseller override is unset (0).
func EffectiveResellerDiscount(discount float64) float64 {
	if discount > 0 {
		return discount
	}
	return DefaultResellerDiscount
}

// EffectiveCustomerMarkup resolves a customer's markup, falling back to the
// shared default when the per-customer override is unset (0).
func EffectiveCustomerMarkup(markup float64) float64 {
	if markup > 0 {
		return markup
	}
	return DefaultCustomerMarkup
}

// ResellerPricing is the resolved per-request pricing for a customer owned by a
// reseller. Multipliers are already resolved (defaults applied).
type ResellerPricing struct {
	ResellerId         int
	CostMultiplier     float64 // admin base discount
	CustomerMultiplier float64 // customer markup
	// EffectiveCustomerMultiplier is cost * markup; the total customer multiplier
	// applied to the platform base price.
	EffectiveCustomerMultiplier float64
}

// IsResellerApplicable reports whether this user is a reseller-owned customer.
func (p ResellerPricing) IsResellerApplicable() bool {
	return p.ResellerId > 0
}

// GetUserResellerId returns the reseller owning a user (0 when not owned).
func GetUserResellerId(userId int) int {
	if userId <= 0 {
		return 0
	}
	var resellerId int
	if err := DB.Model(&User{}).Select("reseller_id").Where("id = ?", userId).Scan(&resellerId).Error; err != nil {
		return 0
	}
	return resellerId
}

// GetResellerCostMultiplier returns the reseller's effective cost multiplier.
func GetResellerCostMultiplier(resellerId int) float64 {
	if resellerId <= 0 {
		return 1
	}
	var discount float64
	if err := DB.Model(&User{}).Select("reseller_discount").Where("id = ? AND role = ?", resellerId, common.RoleResellerUser).Scan(&discount).Error; err != nil {
		return DefaultResellerDiscount
	}
	return EffectiveResellerDiscount(discount)
}

// GetCustomerMarkup returns the customer's effective markup multiplier.
func GetCustomerMarkup(customerId int) float64 {
	if customerId <= 0 {
		return 1
	}
	var markup float64
	if err := DB.Model(&User{}).Select("customer_markup").Where("id = ? AND role = ?", customerId, common.RoleCommonUser).Scan(&markup).Error; err != nil {
		return DefaultCustomerMarkup
	}
	return EffectiveCustomerMarkup(markup)
}

// ResolveResellerPricing builds the per-request pricing for a customer. It
// returns a zero-value ResellerPricing when the customer is not reseller-owned.
func ResolveResellerPricing(customerId int) ResellerPricing {
	resellerId := GetUserResellerId(customerId)
	if resellerId <= 0 {
		return ResellerPricing{}
	}
	cost := GetResellerCostMultiplier(resellerId)
	markup := GetCustomerMarkup(customerId)
	return ResellerPricing{
		ResellerId:                  resellerId,
		CostMultiplier:              cost,
		CustomerMultiplier:          markup,
		EffectiveCustomerMultiplier: cost * markup,
	}
}

// TryReserveResellerCost atomically checks and deducts a reseller's cost
// balance. It never allows an overdraft: the balance is only decreased when it
// is at least `quota`. Works identically on SQLite, MySQL and PostgreSQL.
func TryReserveResellerCost(resellerId int, quota int) (bool, error) {
	if resellerId <= 0 {
		return true, nil
	}
	if quota < 0 {
		return false, errors.New("quota cannot be negative")
	}
	if quota == 0 {
		return true, nil
	}
	result := DB.Model(&User{}).
		Where("id = ? AND role = ? AND reseller_cost_balance >= ?", resellerId, common.RoleResellerUser, quota).
		Update("reseller_cost_balance", gorm.Expr("reseller_cost_balance - ?", quota))
	if result.Error != nil {
		return false, result.Error
	}
	return result.RowsAffected == 1, nil
}

// IncreaseResellerCostBalance adds (or subtracts when negative) to a reseller's
// cost balance. Used by top-ups and refunds of reserved cost.
func IncreaseResellerCostBalance(resellerId int, delta int) error {
	if resellerId <= 0 || delta == 0 {
		return nil
	}
	result := DB.Model(&User{}).
		Where("id = ? AND role = ?", resellerId, common.RoleResellerUser).
		Update("reseller_cost_balance", gorm.Expr("reseller_cost_balance + ?", delta))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// TopUpResellerCost credits a reseller's cost balance. `amountUSD` is the dollar
// amount; the balance is credited 1:1 as amountUSD * QuotaPerUnit quota units.
func TopUpResellerCost(resellerId int, amountUSD float64) (int, error) {
	if resellerId <= 0 {
		return 0, errors.New("invalid reseller")
	}
	if amountUSD <= 0 || math.IsNaN(amountUSD) || math.IsInf(amountUSD, 0) {
		return 0, errors.New("invalid top-up amount")
	}
	quota := common.QuotaFromFloat(amountUSD * common.QuotaPerUnit)
	if quota <= 0 {
		return 0, errors.New("top-up amount too small")
	}
	if err := IncreaseResellerCostBalance(resellerId, quota); err != nil {
		return 0, err
	}
	return quota, nil
}
