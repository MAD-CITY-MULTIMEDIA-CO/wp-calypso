import { translate } from 'i18n-calypso';
/**
 * Menu items for the Global Site View sidebar.
 */
export default function globalSiteSidebarMenu( {
	showSiteMonitoring,
	siteDomain,
	shouldShowAddOns,
	selectedSiteSlug,
	isStagingSite,
	isDesktop,
}: {
	showSiteMonitoring: boolean;
	siteDomain: string;
	shouldShowAddOns: boolean;
	selectedSiteSlug: string;
	isStagingSite: boolean;
	isDesktop: boolean;
} ) {
	return [
		{
			type: 'current-site',
			url: `/home/${ siteDomain }`,
			shouldHide: ! isDesktop,
		},
		{
			slug: 'home',
			title: translate( 'My Home' ),
			type: 'menu-item',
			url: `/home/${ siteDomain }`,
			shouldHide: isDesktop,
		},
		{
			slug: 'wp-admin',
			title: translate( 'WP Admin' ),
			url: `https://${ selectedSiteSlug }/wp-admin`,
			className: 'sidebar__menu-item-wp-admin',
		},
		{
			slug: 'upgrades',
			title: translate( 'Plans' ),
			type: 'menu-item',
			url: `/plans/${ siteDomain }`,
			shouldHide: isStagingSite,
		},
		{
			slug: 'Add-Ons',
			title: translate( 'Add-ons' ),
			type: 'menu-item',
			url: `/add-ons/${ siteDomain }`,
			shouldHide: ! shouldShowAddOns,
		},
		{
			slug: 'domains',
			title: translate( 'Domains' ),
			navigationLabel: translate( 'Manage all domains' ),
			type: 'menu-item',
			url: `/domains/manage/${ siteDomain }`,
			shouldHide: isStagingSite,
		},
		{
			slug: 'Emails',
			title: translate( 'Emails' ),
			type: 'menu-item',
			url: `/email/${ siteDomain }`,
			shouldHide: isStagingSite,
		},
		{
			slug: 'Purchases',
			title: translate( 'Purchases' ),
			type: 'menu-item',
			url: `/purchases/subscriptions/${ siteDomain }`,
			shouldHide: isStagingSite,
		},
		{
			slug: 'options-hosting-configuration-php',
			title: translate( 'Configuration' ),
			type: 'menu-item',
			url: `/hosting-config/${ siteDomain }`,
		},
		{
			slug: 'tools-site-monitoring',
			title: translate( 'Monitoring' ),
			type: 'menu-item',
			url: `/site-monitoring/${ siteDomain }`,
			shouldHide: ! showSiteMonitoring,
		},
		{
			slug: 'tools-earn',
			title: translate( 'Monetize' ),
			type: 'menu-item',
			url: `/earn/${ siteDomain }`,
		},
		{
			slug: 'subscribers',
			title: translate( 'Subscribers' ),
			type: 'menu-item',
			url: `/subscribers/${ siteDomain }`,
		},
		{
			slug: 'connections',
			title: translate( 'Connections' ),
			type: 'menu-item',
			url: `/marketing/connections/${ siteDomain }`,
		},
		{
			slug: 'settings-site',
			title: translate( 'Settings' ),
			type: 'menu-item',
			url: `/settings/general/${ siteDomain }`,
		},
	].filter( ( { shouldHide } ) => ! shouldHide );
}
