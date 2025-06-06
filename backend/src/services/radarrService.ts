import axios, { AxiosInstance } from 'axios';

interface RadarrConfig {
  url: string;
  apiKey: string;
}

interface RadarrMovie {
  id: number;
  title: string;
  year: number;
  tmdbId: number;
  imdbId: string;
  titleSlug: string;
  overview: string;
  monitored: boolean;
  status: string;
  downloaded: boolean;
  hasFile: boolean;
  sizeOnDisk: number;
  qualityProfileId: number;
  added: string;
  ratings: any;
  genres: string[];
  tags: number[];
  certification: string;
  runtime: number;
  images: any[];
  website: string;
  inCinemas: string;
  physicalRelease: string;
  digitalRelease: string;
  path: string;
  rootFolderPath: string;
  folder: string;
  movieFile?: any;
}

interface RadarrActivity {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: Array<{
    id: number;
    eventType: string;
    movieId: number;
    sourcePath: string;
    sourceTitle: string;
    date: string;
    downloadId: string;
    message: string;
    data: any;
  }>;
}

interface RadarrSystemStatus {
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

interface RadarrHealth {
  source: string;
  type: string;
  message: string;
  wikiUrl?: string;
}

class RadarrService {
  private client: AxiosInstance | null = null;
  private config: RadarrConfig | null = null;

  // Initialize with Radarr configuration
  initialize(config: RadarrConfig) {
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

  // Test connection to Radarr
  async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get('/api/v3/system/status');
      const status: RadarrSystemStatus = response.data;

      return {
        success: true,
        message: `Connected to Radarr v${status.version}`,
        version: status.version
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to connect to Radarr: ${message}`
      };
    }
  }

  // Get all movies
  async getMovies(): Promise<RadarrMovie[]> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get('/api/v3/movie');
      return response.data;
    } catch (error) {
      console.error('Failed to get Radarr movies:', error);
      throw error;
    }
  }

  // Get movie by ID
  async getMovie(id: number): Promise<RadarrMovie> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get(`/api/v3/movie/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get Radarr movie ${id}:`, error);
      throw error;
    }
  }

  // Get recent activity/history
  async getActivity(page: number = 1, pageSize: number = 50): Promise<RadarrActivity> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
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
      console.error('Failed to get Radarr activity:', error);
      throw error;
    }
  }

  // Get system status
  async getSystemStatus(): Promise<RadarrSystemStatus> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get('/api/v3/system/status');
      return response.data;
    } catch (error) {
      console.error('Failed to get Radarr system status:', error);
      throw error;
    }
  }

  // Get health check
  async getHealth(): Promise<RadarrHealth[]> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get('/api/v3/health');
      return response.data;
    } catch (error) {
      console.error('Failed to get Radarr health:', error);
      throw error;
    }
  }

  // Get disk space
  async getDiskSpace(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get('/api/v3/diskspace');
      return response.data;
    } catch (error) {
      console.error('Failed to get Radarr disk space:', error);
      throw error;
    }
  }

  // Get quality profiles
  async getQualityProfiles(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get('/api/v3/qualityprofile');
      return response.data;
    } catch (error) {
      console.error('Failed to get Radarr quality profiles:', error);
      throw error;
    }
  }

  // Get root folders
  async getRootFolders(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get('/api/v3/rootfolder');
      return response.data;
    } catch (error) {
      console.error('Failed to get Radarr root folders:', error);
      throw error;
    }
  }

  // Get download client status
  async getDownloadClients(): Promise<any[]> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get('/api/v3/downloadclient');
      return response.data;
    } catch (error) {
      console.error('Failed to get Radarr download clients:', error);
      throw error;
    }
  }

  // Get queue (downloading movies)
  async getQueue(): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      const response = await this.client.get('/api/v3/queue');
      return response.data;
    } catch (error) {
      console.error('Failed to get Radarr queue:', error);
      throw error;
    }
  }

  // Get comprehensive data for dashboard
  async getComprehensiveData(): Promise<any> {
    try {
      const [
        movies,
        activity,
        systemStatus,
        health,
        diskSpace,
        qualityProfiles,
        rootFolders,
        queue
      ] = await Promise.allSettled([
        this.getMovies(),
        this.getActivity(1, 20),
        this.getSystemStatus(),
        this.getHealth(),
        this.getDiskSpace(),
        this.getQualityProfiles(),
        this.getRootFolders(),
        this.getQueue()
      ]);

      return {
        movies: movies.status === 'fulfilled' ? movies.value : [],
        activity: activity.status === 'fulfilled' ? activity.value : { records: [] },
        systemStatus: systemStatus.status === 'fulfilled' ? systemStatus.value : null,
        health: health.status === 'fulfilled' ? health.value : [],
        diskSpace: diskSpace.status === 'fulfilled' ? diskSpace.value : [],
        qualityProfiles: qualityProfiles.status === 'fulfilled' ? qualityProfiles.value : [],
        rootFolders: rootFolders.status === 'fulfilled' ? rootFolders.value : [],
        queue: queue.status === 'fulfilled' ? queue.value : { records: [] },
        timestamp: new Date().toISOString(),
        statistics: {
          totalMovies: movies.status === 'fulfilled' ? movies.value.length : 0,
          monitoredMovies: movies.status === 'fulfilled' ? movies.value.filter((m: RadarrMovie) => m.monitored).length : 0,
          downloadedMovies: movies.status === 'fulfilled' ? movies.value.filter((m: RadarrMovie) => m.hasFile).length : 0,
          totalSizeOnDisk: movies.status === 'fulfilled' ? movies.value.reduce((sum: number, m: RadarrMovie) => sum + (m.sizeOnDisk || 0), 0) : 0
        }
      };
    } catch (error) {
      console.error('Failed to get comprehensive Radarr data:', error);
      throw error;
    }
  }

  // Check if service is configured
  isConfigured(): boolean {
    return !!(this.config && this.client);
  }

  // Add movie to Radarr
  async addItem(movieData: any): Promise<any> {
    try {
      if (!this.client) {
        throw new Error('Radarr client not initialized');
      }

      // Get root folders and quality profiles if not specified
      const [rootFolders, qualityProfiles] = await Promise.all([
        this.getRootFolders(),
        this.getQualityProfiles()
      ]);

      // Use default root folder and quality profile if not specified
      const rootFolderId = movieData.rootFolder || (rootFolders.length > 0 ? rootFolders[0].id : 1);
      const qualityProfileId = movieData.qualityProfile || (qualityProfiles.length > 0 ? qualityProfiles[0].id : 1);

      // Prepare movie data for Radarr API
      const radarrMovie = {
        title: movieData.title,
        tmdbId: movieData.tmdbId,
        year: parseInt(movieData.year) || new Date().getFullYear(),
        qualityProfileId: qualityProfileId,
        rootFolderPath: rootFolders.find(rf => rf.id === rootFolderId)?.path || rootFolders[0]?.path,
        monitored: movieData.monitored !== false,
        minimumAvailability: 'announced',
        tags: [],
        addOptions: {
          monitor: movieData.monitored !== false ? 'movieOnly' : 'none',
          searchForMovie: movieData.searchForMissing !== false
        }
      };

      console.log(`🎬 Adding movie "${movieData.title}" to Radarr...`);
      const response = await this.client.post('/api/v3/movie', radarrMovie);
      
      console.log(`✅ Successfully added "${movieData.title}" to Radarr`);
      return {
        success: true,
        message: `Successfully added "${movieData.title}" to Radarr`,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ Failed to add movie to Radarr:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        message: `Failed to add movie to Radarr: ${errorMessage}`,
        error: errorMessage
      };
    }
  }

  // Get current configuration
  getConfig(): RadarrConfig | null {
    return this.config;
  }

  // Get server configuration (root folders, quality profiles) for frontend
  async getServerConfig(): Promise<any> {
    try {
      console.log('🔧 Getting Radarr server configuration...');
      
      const [rootFolders, qualityProfiles] = await Promise.all([
        this.getRootFolders(),
        this.getQualityProfiles()
      ]);

      const config = {
        service: 'radarr',
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
        }))
      };

      console.log(`✅ Radarr server config: ${rootFolders.length} root folders, ${qualityProfiles.length} quality profiles`);
      console.log('📁 Root folders:', rootFolders.map(f => f.path).join(', '));
      console.log('🎯 Quality profiles:', qualityProfiles.map(p => p.name).join(', '));

      return {
        success: true,
        data: config
      };
    } catch (error) {
      console.error('❌ Failed to get Radarr server config:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const radarrService = new RadarrService();
export default radarrService; 