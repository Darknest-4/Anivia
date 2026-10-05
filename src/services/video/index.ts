import { config } from '@/config'
import { ApiVideoProvider } from './apiVideoProvider'
import type { VideoProvider } from './VideoProvider'

export type { VideoProvider } from './VideoProvider'

/** No licensed stream configured: the watch page plays the official trailer instead. */
const noVideo: VideoProvider = { getSource: async () => null }

export const videoProvider: VideoProvider = config.videoProvider === 'api' && config.apiBaseUrl ? new ApiVideoProvider(config.apiBaseUrl) : noVideo
export const hasVideoProvider = videoProvider !== noVideo
