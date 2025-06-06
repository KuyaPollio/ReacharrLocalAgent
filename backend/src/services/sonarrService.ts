import axios, { AxiosInstance } from 'axios';

interface SonarrConfig {
  url: string;
  apiKey: string;
}

interface SonarrSeries {
  id: number;
  title: string;
  alternateTitles: any[];
  sortTitle: string;
  status: string;
  ended: boolean;
  overview: string;
  previousAiring?: string;
  nextAiring?: string;
  network: string;
  airTime: string;
  images: any[];
  seasons: Array<{
    seasonNumber: number;
    monitored: boolean;
    statistics?: {
      previousAiring?: string;
      episodeFileCount: number;
      episodeCount: number;
      totalEpisodeCount: number;
      sizeOnDisk: number;
      percentOfEpisodes: number;
    };
  }>;
  year: number;
  path: string;
  qualityProfileId: number;
  languageProfileId: number;
  seriesType: string;
  cleanTitle: string;
  imdbId: string;
  tvdbId: number;
  tvRageId: number;
  tvMazeId: number;
  firstAired: string;
  lastInfoSync?: string;
  runtime: number;
  timeOfDay?: string;
  certification: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings: any;
  statistics?: {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
  monitored: boolean;
  useSceneNumbering: boolean;
  titleSlug: string;
  rootFolderPath: string;
  folder: string;
}

interface SonarrActivity {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: Array<{
    id: number;
    episodeId: number;
    seriesId: number;
    sourceTitle: string;
    quality: any;
    customFormats: any[];
    qualityCutoffNotMet: boolean;
    languageCutoffNotMet: boolean;
    date: string;
    downloadId: string;
    eventType: string;
    data: any;
    series: {
      id: number;
      title: string;
      path: string;
      tvdbId: number;
    };
    episode: {
      id: number;
      episodeNumber: number;
      seasonNumber: number;
      title: string;
      airDate: string;
      airDateUtc: string;
    };
  }>;
}

interface SonarrSystemStatus {
  version: string;
  buildTime: string;
  isDebug: boolean;
  isProduction: boolean;
  isAdmin: boolean;
  isUserInteractive: boolean;
  startupPath: string;
  appData: string;
  osName: string;
  osVersion: string;
  isMonoRuntime: boolean;
  isMono: boolean;
  isLinux: boolean;
  isOsx: boolean;
  isWindows: boolean;
  branch: string;
  authentication: string;
  sqliteVersion: string;
  urlBase: string;
  runtimeVersion: string;
  runtimeName: string;
}

interface SonarrHealth {
  source: string;
  type: string;
  message: string;
  wikiUrl?: string;
}

class SonarrService {
  private client: AxiosInstance | null = null;
  private config: SonarrConfig | null = null;

  // Initialize with Sonarr configuration
  initialize(config: SonarrConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.url.replace(/\/$/, ''), // Remove trailing slash
      headers: {
        'X-Api-Key': config.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  // Test connection to Sonarr
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/system/status');
      const status: SonarrSystemStatus = response.data;

      return {
        success: true,
        message: `Connected to Sonarr v${status.version}`,
        version: status.version
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to connect to Sonarr: ${message}`
      };
    }
  }

  // Get all series
  async getSeries(): Promise<SonarrSeries[]> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/series');
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr series:', error);
      throw error;
    }
  }

  // Get series by ID
  async getSeriesById(id: number): Promise<SonarrSeries> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get(`/api/v3/series/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get Sonarr series ${id}:`, error);
      throw error;
    }
  }

  // Get episodes for a series
  async getEpisodes(seriesId?: number): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const params = seriesId ? { seriesId } : {};
      const response = await this.client.get('/api/v3/episode', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr episodes:', error);
      throw error;
    }
  }

  // Get recent activity/history
  async getActivity(page: number = 1, pageSize: number = 50): Promise<SonarrActivity> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/history', {
        params: {
          page,
          pageSize,
          sortKey: 'date',
          sortDirection: 'descending'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr activity:', error);
      throw error;
    }
  }

  // Get system status
  async getSystemStatus(): Promise<SonarrSystemStatus> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/system/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr system status:', error);
      throw error;
    }
  }

  // Get health check
  async getHealth(): Promise<SonarrHealth[]> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/health');
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr health:', error);
      throw error;
    }
  }

  // Get disk space
  async getDiskSpace(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/diskspace');
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr disk space:', error);
      throw error;
    }
  }

  // Get quality profiles
  async getQualityProfiles(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/qualityprofile');
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr quality profiles:', error);
      throw error;
    }
  }

  // Get language profiles
  async getLanguageProfiles(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/languageprofile');
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr language profiles:', error);
      throw error;
    }
  }

  // Get root folders
  async getRootFolders(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/rootfolder');
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr root folders:', error);
      throw error;
    }
  }

  // Get download clients
  async getDownloadClients(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/downloadclient');
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr download clients:', error);
      throw error;
    }
  }

  // Get queue (downloading episodes)
  async getQueue(): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const response = await this.client.get('/api/v3/queue');
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr queue:', error);
      throw error;
    }
  }

  // Get calendar (upcoming episodes)
  async getCalendar(start?: string, end?: string): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      const params: any = {};
      if (start) params.start = start;
      if (end) params.end = end;

      const response = await this.client.get('/api/v3/calendar', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to get Sonarr calendar:', error);
      throw error;
    }
  }

  // Get comprehensive data for dashboard
  async getComprehensiveData(): Promise<any> {
    try {
      const [
        series,
        activity,
        systemStatus,
        health,
        diskSpace,
        qualityProfiles,
        languageProfiles,
        rootFolders,
        queue,
        calendar
      ] = await Promise.allSettled([
        this.getSeries(),
        this.getActivity(1, 20),
        this.getSystemStatus(),
        this.getHealth(),
        this.getDiskSpace(),
        this.getQualityProfiles(),
        this.getLanguageProfiles(),
        this.getRootFolders(),
        this.getQueue(),
        this.getCalendar()
      ]);

      const seriesData = series.status === 'fulfilled' ? series.value : [];

      return {
        series: seriesData,
        activity: activity.status === 'fulfilled' ? activity.value : { records: [] },
        systemStatus: systemStatus.status === 'fulfilled' ? systemStatus.value : null,
        health: health.status === 'fulfilled' ? health.value : [],
        diskSpace: diskSpace.status === 'fulfilled' ? diskSpace.value : [],
        qualityProfiles: qualityProfiles.status === 'fulfilled' ? qualityProfiles.value : [],
        languageProfiles: languageProfiles.status === 'fulfilled' ? languageProfiles.value : [],
        rootFolders: rootFolders.status === 'fulfilled' ? rootFolders.value : [],
        queue: queue.status === 'fulfilled' ? queue.value : { records: [] },
        calendar: calendar.status === 'fulfilled' ? calendar.value : [],
        timestamp: new Date().toISOString(),
        statistics: {
          totalSeries: seriesData.length,
          monitoredSeries: seriesData.filter((s: SonarrSeries) => s.monitored).length,
          endedSeries: seriesData.filter((s: SonarrSeries) => s.ended).length,
          continuingSeries: seriesData.filter((s: SonarrSeries) => !s.ended).length,
          totalEpisodes: seriesData.reduce((sum: number, s: SonarrSeries) => sum + (s.statistics?.totalEpisodeCount || 0), 0),
          downloadedEpisodes: seriesData.reduce((sum: number, s: SonarrSeries) => sum + (s.statistics?.episodeFileCount || 0), 0),
          totalSizeOnDisk: seriesData.reduce((sum: number, s: SonarrSeries) => sum + (s.statistics?.sizeOnDisk || 0), 0),
          totalSeasons: seriesData.reduce((sum: number, s: SonarrSeries) => sum + (s.statistics?.seasonCount || 0), 0)
        }
      };
    } catch (error) {
      console.error('Failed to get comprehensive Sonarr data:', error);
      throw error;
    }
  }

  // Check if service is configured
  isConfigured(): boolean {
    return !!(this.config && this.client);
  }

  // Add TV series to Sonarr
  async addItem(seriesData: any): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Sonarr client not initialized');
      }

      // Get root folders, quality profiles, and language profiles if not specified
      const [rootFolders, qualityProfiles, languageProfiles] = await Promise.all([
        this.getRootFolders(),
        this.getQualityProfiles(),
        this.getLanguageProfiles()
      ]);

      // Use default values if not specified
      const rootFolderId = seriesData.rootFolder || (rootFolders.length > 0 ? rootFolders[0].id : 1);
      const qualityProfileId = seriesData.qualityProfile || (qualityProfiles.length > 0 ? qualityProfiles[0].id : 1);
      const languageProfileId = languageProfiles.length > 0 ? languageProfiles[0].id : 1;

      // Prepare series data for Sonarr API
      const sonarrSeries = {
        title: seriesData.title,
        tvdbId: seriesData.tmdbId, // This will now be TVDB ID for TV shows (converted by remote server)
        qualityProfileId: qualityProfileId,
        languageProfileId: languageProfileId,
        rootFolderPath: rootFolders.find(rf => rf.id === rootFolderId)?.path || rootFolders[0]?.path,
        monitored: seriesData.monitored !== false,
        seriesType: 'standard',
        seasonFolder: true,
        tags: [],
        addOptions: {
          monitor: seriesData.monitored !== false ? 'all' : 'none',
          searchForMissingEpisodes: seriesData.searchForMissing !== false,
          searchForCutoffUnmetEpisodes: false
        }
      };

      console.log(`📺 Adding TV series "${seriesData.title}" to Sonarr...`);
      const response = await this.client.post('/api/v3/series', sonarrSeries);
      
      console.log(`✅ Successfully added "${seriesData.title}" to Sonarr`);
      return {
        success: true,
        message: `Successfully added "${seriesData.title}" to Sonarr`,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ Failed to add TV series to Sonarr:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to add TV series to Sonarr: ${errorMessage}`,
        error: errorMessage
      };
    }
  }

  // Get current configuration
  getConfig(): SonarrConfig | null {
    return this.config;
  }

  // Get server configuration (root folders, quality profiles, language profiles) for frontend
  async getServerConfig(): Promise<any> {
    try {
      console.log('🔧 Getting Sonarr server configuration...');
      
      const [rootFolders, qualityProfiles, languageProfiles] = await Promise.all([
        this.getRootFolders(),
        this.getQualityProfiles(),
        this.getLanguageProfiles()
      ]);

      const config = {
        service: 'sonarr',
        rootFolders: rootFolders.map(folder => ({
          id: folder.id,
          path: folder.path,
          freeSpace: folder.freeSpace || 0,
          unmappedFolders: folder.unmappedFolders || []
        })),
        qualityProfiles: qualityProfiles.map(profile => ({
          id: profile.id,
          name: profile.name,
          cutoff: profile.cutoff || {},
          items: profile.items || []
        })),
        languageProfiles: languageProfiles.map(profile => ({
          id: profile.id,
          name: profile.name,
          cutoff: profile.cutoff || {},
          languages: profile.languages || []
        }))
      };

      console.log(`✅ Sonarr server config: ${rootFolders.length} root folders, ${qualityProfiles.length} quality profiles, ${languageProfiles.length} language profiles`);
      console.log('📁 Root folders:', rootFolders.map(f => f.path).join(', '));
      console.log('🎯 Quality profiles:', qualityProfiles.map(p => p.name).join(', '));
      console.log('🌐 Language profiles:', languageProfiles.map(p => p.name).join(', '));

      return {
        success: true,
        data: config
      };
    } catch (error) {
      console.error('❌ Failed to get Sonarr server config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const sonarrService = new SonarrService();
export default sonarrService; 