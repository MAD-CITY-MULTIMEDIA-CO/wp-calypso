import {
	PLAN_MONTHLY_PERIOD,
	type PlanSlug,
	getTermFromDuration,
	calculateMonthlyPrice,
} from '@automattic/calypso-products';
import { useSelect } from '@wordpress/data';
import * as Plans from '../';
import * as Purchases from '../../purchases';
import * as WpcomPlansUI from '../../wpcom-plans-ui';
import type { AddOnMeta } from '../../add-ons/types';

export type UseCheckPlanAvailabilityForPurchase = ( { planSlugs }: { planSlugs: PlanSlug[] } ) => {
	[ planSlug in PlanSlug ]?: boolean;
};

interface Props {
	planSlugs: PlanSlug[];

	/**
	 * `selectedSiteId` required on purpose to mitigate risk with not passing something through when we should
	 */
	selectedSiteId: number | null | undefined;

	/**
	 * `coupon` required on purpose to mitigate risk with not passing somethiing through when we should
	 */
	coupon: string | undefined;

	/**
	 * `useCheckPlanAvailabilityForPurchase` required on purpose to avoid inconsistent data across Calypso.
	 *     - It returns an index of planSlugs and whether they are available for purchase (non-available plans
	 * will not have the discounted prices attached).
	 *     - It's a function that is not available in the data store, but can be easily mocked in other contexts.
	 *     - For Calypso instances, this should be the same function. So find other/existing cases and import the same.
	 */
	useCheckPlanAvailabilityForPurchase: UseCheckPlanAvailabilityForPurchase;

	/**
	 * `storageAddOmns` TODO: should become a required prop.
	 */
	storageAddOns: ( AddOnMeta | null )[] | null;
	withoutPlanUpgradeCredits?: boolean;
}

function getTotalPrice( planPrice: number | null | undefined, addOnPrice = 0 ): number | null {
	return null !== planPrice && undefined !== planPrice ? planPrice + addOnPrice : null;
}

/**
 * This hook is a re-projection of the the pricing metadata derived from `usePlans` and `useSitePlans` hooks.
 * It returns the pricing metadata as needed for the Calypso grid components, which may be adjusted based on the selected site,
 * storage add-ons, current plan (will use the actual purchase price for `originalPrice` in this case), etc.
 *
 * For most uses within Calypso (e.g. pricing grids), this should work. However, if you need to access the pricing metadata directly,
 * you should use the `usePlans` and `useSitePlans` hooks instead.
 *
 * Check the properties, incode docs (numbered set of cases), and `PricingMetaForGridPlan` type for additional details.
 */
const usePricingMetaForGridPlans = ( {
	planSlugs,
	selectedSiteId,
	coupon,
	useCheckPlanAvailabilityForPurchase,
	withoutPlanUpgradeCredits = false,
	storageAddOns,
}: Props ): { [ planSlug: string ]: Plans.PricingMetaForGridPlan } | null => {
	const planAvailabilityForPurchase = useCheckPlanAvailabilityForPurchase( { planSlugs } );
	// plans - should have a definition for all plans, being the main source of API data
	const plans = Plans.usePlans( { coupon } );
	// sitePlans - unclear if all plans are included
	const sitePlans = Plans.useSitePlans( { siteId: selectedSiteId } );
	const currentPlan = Plans.useCurrentPlan( { siteId: selectedSiteId } );
	const introOffers = Plans.useIntroOffers( { siteId: selectedSiteId, coupon } );
	const purchasedPlan = Purchases.useSitePurchaseById( {
		siteId: selectedSiteId,
		purchaseId: currentPlan?.purchaseId,
	} );
	const selectedStorageOptions = useSelect(
		( select ) => select( WpcomPlansUI.store ).getSelectedStorageOptions( selectedSiteId ),
		[]
	);

	let planPrices:
		| {
				[ planSlug in PlanSlug ]?: {
					originalPrice: Plans.PlanPricing[ 'originalPrice' ];
					discountedPrice: Plans.PlanPricing[ 'discountedPrice' ];
				};
		  }
		| null = null;

	if ( ( selectedSiteId && sitePlans.isLoading ) || plans.isLoading ) {
		/**
		 * Null until all data is ready, at least in initial state.
		 * - For now a simple loader is shown until these are resolved
		 * - `sitePlans` being a dependent query will only get fetching status when enabled (when `selectedSiteId` exists)
		 */
		planPrices = null;
	} else {
		planPrices = Object.fromEntries(
			planSlugs.map( ( planSlug ) => {
				const availableForPurchase = planAvailabilityForPurchase[ planSlug ];
				const selectedStorageOption = selectedStorageOptions?.[ planSlug ];
				const selectedStorageAddOn = storageAddOns?.find( ( addOn ) => {
					return selectedStorageOption && addOn?.featureSlugs?.includes( selectedStorageOption );
				} );
				const storageAddOnPrices =
					selectedStorageAddOn?.purchased || selectedStorageAddOn?.exceedsSiteStorageLimits
						? null
						: selectedStorageAddOn?.prices;
				const storageAddOnPriceMonthly = storageAddOnPrices?.monthlyPrice || 0;
				const storageAddOnPriceYearly = storageAddOnPrices?.yearlyPrice || 0;

				const plan = plans.data?.[ planSlug ];
				const sitePlan = sitePlans.data?.[ planSlug ];

				/**
				 * 0. No plan or sitePlan (when selected site exists): planSlug is for a priceless plan.
				 * TODO clk: the condition on `.pricing` here needs investigation. There should be a pricing object for all returned API plans.
				 */
				if ( ! plan?.pricing || ( selectedSiteId && ! sitePlan?.pricing ) ) {
					return [
						planSlug,
						{
							originalPrice: {
								monthly: null,
								full: null,
							},
							discountedPrice: {
								monthly: null,
								full: null,
							},
						},
					];
				}

				/**
				 * 1. Original prices only for current site's plan.
				 *   - The current site's plan gets the price with which the plan was purchased
				 *     (so may not be the most recent billing plan's).
				 */
				if ( selectedSiteId && currentPlan?.planSlug === planSlug ) {
					let monthlyPrice = sitePlan?.pricing.originalPrice.monthly;
					let fullPrice = sitePlan?.pricing.originalPrice.full;

					/**
					 * Ensure the spotlight (current) plan shows the price with which the plan was purchased.
					 */
					if ( purchasedPlan ) {
						const isMonthly = purchasedPlan.billPeriodDays === PLAN_MONTHLY_PERIOD;

						if ( isMonthly && monthlyPrice !== purchasedPlan.priceInteger ) {
							monthlyPrice = purchasedPlan.priceInteger;
							fullPrice = parseFloat( ( purchasedPlan.priceInteger * 12 ).toFixed( 2 ) );
						} else if ( fullPrice !== purchasedPlan.priceInteger ) {
							const term = getTermFromDuration( purchasedPlan.billPeriodDays ) || '';
							monthlyPrice = calculateMonthlyPrice( term, purchasedPlan.priceInteger );
							fullPrice = purchasedPlan.priceInteger;
						}
					}

					return [
						planSlug,
						{
							originalPrice: {
								monthly: getTotalPrice( monthlyPrice ?? null, storageAddOnPriceMonthly ),
								full: getTotalPrice( fullPrice ?? null, storageAddOnPriceYearly ),
							},
							discountedPrice: {
								monthly: null,
								full: null,
							},
						},
					];
				}

				/**
				 * 2. Original and Discounted prices for plan available for purchase.
				 * - If prorated credits are needed, then pick the discounted price from sitePlan (site context) if one exists.
				 */
				if ( availableForPurchase ) {
					const originalPrice = {
						monthly: getTotalPrice( plan.pricing.originalPrice.monthly, storageAddOnPriceMonthly ),
						full: getTotalPrice( plan.pricing.originalPrice.full, storageAddOnPriceYearly ),
					};
					const discountedPrice = {
						monthly:
							sitePlan?.pricing && ! withoutPlanUpgradeCredits
								? getTotalPrice(
										sitePlan.pricing.discountedPrice.monthly,
										storageAddOnPriceMonthly
								  )
								: getTotalPrice( plan.pricing.discountedPrice.monthly, storageAddOnPriceMonthly ),
						full:
							sitePlan?.pricing && ! withoutPlanUpgradeCredits
								? getTotalPrice( sitePlan.pricing.discountedPrice.full, storageAddOnPriceYearly )
								: getTotalPrice( plan.pricing.discountedPrice.full, storageAddOnPriceYearly ),
					};

					return [
						planSlug,
						{
							originalPrice,
							discountedPrice,
						},
					];
				}

				/**
				 * 3. Original prices only for plan not available for purchase.
				 */
				return [
					planSlug,
					{
						originalPrice: {
							monthly: getTotalPrice(
								plan.pricing.originalPrice.monthly,
								storageAddOnPriceMonthly
							),
							full: getTotalPrice( plan.pricing.originalPrice.full, storageAddOnPriceYearly ),
						},
						discountedPrice: {
							monthly: null,
							full: null,
						},
					},
				];
			} )
		);
	}

	return (
		// TODO: consider removing the null return
		planPrices &&
		planSlugs.reduce(
			( acc, planSlug ) => ( {
				...acc,
				[ planSlug ]: {
					originalPrice: planPrices?.[ planSlug ]?.originalPrice,
					discountedPrice: planPrices?.[ planSlug ]?.discountedPrice,
					// TODO clk: the condition on `.pricing` here needs investigation. There should be a pricing object for all returned API plans.
					billingPeriod: plans.data?.[ planSlug ]?.pricing?.billPeriod,
					// TODO clk: the condition on `.pricing` here needs investigation. There should be a pricing object for all returned API plans.
					currencyCode: plans.data?.[ planSlug ]?.pricing?.currencyCode,
					expiry: sitePlans.data?.[ planSlug ]?.expiry,
					introOffer: introOffers?.[ planSlug ],
				},
			} ),
			{} as { [ planSlug in PlanSlug ]?: Plans.PricingMetaForGridPlan }
		)
	);
};

export default usePricingMetaForGridPlans;
