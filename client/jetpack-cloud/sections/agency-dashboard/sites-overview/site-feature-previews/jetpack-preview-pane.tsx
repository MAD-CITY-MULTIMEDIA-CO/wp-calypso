import { useTranslate } from 'i18n-calypso';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import SitesDashboardContext from 'calypso/a8c-for-agencies/sections/sites/sites-dashboard-context';
import { setSelectedSiteId } from 'calypso/state/ui/actions';
import { getSelectedSiteId } from 'calypso/state/ui/selectors';
import { useJetpackAgencyDashboardRecordTrackEvent } from '../../hooks';
import SitePreviewPane, { createFeaturePreview } from '../site-preview-pane';
import { SitePreviewPaneProps } from '../site-preview-pane/types';
import { JetpackActivityPreview } from './jetpack-activity';
import { JetpackBackupPreview } from './jetpack-backup';
import { JetpackBoostPreview } from './jetpack-boost';
import { JetpackMonitorPreview } from './jetpack-monitor';
import { JetpackPluginsPreview } from './jetpack-plugins';
import { JetpackScanPreview } from './jetpack-scan';
import { JetpackStatsPreview } from './jetpack-stats';

export function JetpackPreviewPane( {
	site,
	closeSitePreviewPane,
	className,
	isSmallScreen = false,
	hasError = false,
}: SitePreviewPaneProps ) {
	const translate = useTranslate();
	const recordEvent = useJetpackAgencyDashboardRecordTrackEvent( [ site ], ! isSmallScreen );

	const dispatch = useDispatch();
	const selectedSiteId = useSelector( getSelectedSiteId );

	useEffect( () => {
		if ( site ) {
			dispatch( setSelectedSiteId( site.blog_id ) );
		}
	}, [ dispatch, site ] );

	const trackEvent = useCallback(
		( eventName: string ) => {
			recordEvent( eventName );
		},
		[ recordEvent ]
	);

	const { selectedSiteFeature, setSelectedSiteFeature } = useContext( SitesDashboardContext );

	// Jetpack features: Boost, Backup, Monitor, Stats
	const features = useMemo(
		() => [
			createFeaturePreview(
				'jetpack_boost',
				'Boost',
				true,
				selectedSiteFeature,
				setSelectedSiteFeature,
				<JetpackBoostPreview site={ site } trackEvent={ trackEvent } hasError={ hasError } />
			),
			createFeaturePreview(
				'jetpack_backup',
				'Backup',
				true,
				selectedSiteFeature,
				setSelectedSiteFeature,
				<JetpackBackupPreview />
			),
			createFeaturePreview(
				'jetpack_scan',
				'Scan',
				true,
				selectedSiteFeature,
				setSelectedSiteFeature,
				<JetpackScanPreview sideId={ site.blog_id } />
			),
			createFeaturePreview(
				'jetpack_monitor',
				'Monitor',
				true,
				selectedSiteFeature,
				setSelectedSiteFeature,
				<JetpackMonitorPreview site={ site } trackEvent={ trackEvent } hasError={ hasError } />
			),
			createFeaturePreview(
				'jetpack_plugins',
				translate( 'Plugins' ),
				true,
				selectedSiteFeature,
				setSelectedSiteFeature,
				<JetpackPluginsPreview
					link={ '/plugins/manage/' + site.url }
					linkLabel={ translate( 'Manage Plugins' ) }
					featureText={ translate( 'Manage all plugins installed on %(siteUrl)s', {
						args: { siteUrl: site.url },
					} ) }
				/>
			),
			createFeaturePreview(
				'jetpack_stats',
				'Stats',
				true,
				selectedSiteFeature,
				setSelectedSiteFeature,
				<JetpackStatsPreview site={ site } trackEvent={ trackEvent } />
			),
			createFeaturePreview(
				'jetpack_activity',
				translate( 'Activity' ),
				true,
				selectedSiteFeature,
				setSelectedSiteFeature,
				<JetpackActivityPreview isLoading={ ! selectedSiteId } />
			),
		],
		[
			selectedSiteFeature,
			setSelectedSiteFeature,
			site,
			trackEvent,
			hasError,
			translate,
			selectedSiteId,
		]
	);

	return (
		<SitePreviewPane
			site={ site }
			closeSitePreviewPane={ closeSitePreviewPane }
			features={ features }
			className={ className }
		/>
	);
}
