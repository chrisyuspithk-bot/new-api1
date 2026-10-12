package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func createResellerTestUser(t *testing.T, role int, costBalance int, discount float64) User {
	t.Helper()
	user := User{
		Username:            "reseller-" + common.GetRandomString(6),
		Password:            "unused-password-hash",
		Role:                role,
		Status:              common.UserStatusEnabled,
		Group:               "default",
		AuthVersion:         1,
		AffCode:             "reseller-aff-" + common.GetRandomString(8),
		ResellerCostBalance: costBalance,
		ResellerDiscount:    discount,
	}
	require.NoError(t, DB.Create(&user).Error)
	return user
}

func getResellerCostBalance(t *testing.T, id int) int {
	t.Helper()
	var user User
	require.NoError(t, DB.Select("reseller_cost_balance").First(&user, id).Error)
	return user.ResellerCostBalance
}

// TestTryReserveResellerCostNoOverdraft verifies the atomic no-overdraft
// guarantee: the balance is only reduced when sufficient, and an overdraft
// attempt leaves the balance untouched.
func TestTryReserveResellerCostNoOverdraft(t *testing.T) {
	truncateTables(t)
	reseller := createResellerTestUser(t, common.RoleResellerUser, 100, 0)

	ok, err := TryReserveResellerCost(reseller.Id, 60)
	require.NoError(t, err)
	assert.True(t, ok)
	assert.Equal(t, 40, getResellerCostBalance(t, reseller.Id))

	// Exact-match reservation succeeds and zeroes the balance.
	ok, err = TryReserveResellerCost(reseller.Id, 40)
	require.NoError(t, err)
	assert.True(t, ok)
	assert.Equal(t, 0, getResellerCostBalance(t, reseller.Id))

	// Overdraft is rejected atomically: balance stays 0.
	ok, err = TryReserveResellerCost(reseller.Id, 1)
	require.NoError(t, err)
	assert.False(t, ok)
	assert.Equal(t, 0, getResellerCostBalance(t, reseller.Id))

	// Non-reseller ids are a no-op success.
	ok, err = TryReserveResellerCost(0, 100)
	require.NoError(t, err)
	assert.True(t, ok)

	// A role mismatch (common user) cannot be reserved.
	commonUser := createResellerTestUser(t, common.RoleCommonUser, 500, 0)
	ok, err = TryReserveResellerCost(commonUser.Id, 1)
	require.NoError(t, err)
	assert.False(t, ok)
}

// TestTopUpResellerCost verifies the 1:1 USD -> quota conversion and the
// negative/zero/invalid rejection path.
func TestTopUpResellerCost(t *testing.T) {
	truncateTables(t)
	reseller := createResellerTestUser(t, common.RoleResellerUser, 0, 0)

	quota, err := TopUpResellerCost(reseller.Id, 10)
	require.NoError(t, err)
	assert.Equal(t, int(10*common.QuotaPerUnit), quota)
	assert.Equal(t, quota, getResellerCostBalance(t, reseller.Id))

	// Negative and zero top-ups are rejected.
	_, err = TopUpResellerCost(reseller.Id, -5)
	require.Error(t, err)
	_, err = TopUpResellerCost(reseller.Id, 0)
	require.Error(t, err)

	// Non-reseller top-up fails.
	commonUser := createResellerTestUser(t, common.RoleCommonUser, 0, 0)
	_, err = TopUpResellerCost(commonUser.Id, 10)
	require.Error(t, err)
}

// TestResolveResellerPricing verifies the cost/markup resolution and defaults.
func TestResolveResellerPricing(t *testing.T) {
	truncateTables(t)
	oldDefault := DefaultResellerDiscount
	t.Cleanup(func() { DefaultResellerDiscount = oldDefault })
	DefaultResellerDiscount = 0.8

	reseller := createResellerTestUser(t, common.RoleResellerUser, 0, 0.5)

	customer := User{
		Username:       "customer-" + common.GetRandomString(6),
		Password:       "unused-password-hash",
		Role:           common.RoleCommonUser,
		Status:         common.UserStatusEnabled,
		Group:          "default",
		AuthVersion:    1,
		AffCode:        "customer-aff-" + common.GetRandomString(8),
		ResellerId:     &reseller.Id,
		CustomerMarkup: 1.2,
	}
	require.NoError(t, DB.Create(&customer).Error)

	pricing := ResolveResellerPricing(customer.Id)
	require.True(t, pricing.IsResellerApplicable())
	assert.Equal(t, reseller.Id, pricing.ResellerId)
	assert.Equal(t, 0.5, pricing.CostMultiplier)
	assert.Equal(t, 1.2, pricing.CustomerMultiplier)
	assert.InDelta(t, 0.6, pricing.EffectiveCustomerMultiplier, 1e-9)

	// Unassigned customer resolves to a non-applicable (zero) pricing.
	direct := createResellerTestUser(t, common.RoleCommonUser, 0, 0)
	assert.False(t, ResolveResellerPricing(direct.Id).IsResellerApplicable())
}
