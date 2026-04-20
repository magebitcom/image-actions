import path from 'path'
import { glob } from 'glob'
import * as core from '@actions/core'

import getConfig from './config'
import { REPO_DIRECTORY, FILE_EXTENSIONS_TO_PROCESS } from './constants'

const getRepositoryImages = async (): Promise<string[]> => {
  const config = await getConfig()

  if (!REPO_DIRECTORY) {
    throw new Error('REPO_DIRECTORY is not set.')
  }

  const repoDir = path.resolve(REPO_DIRECTORY)
  const globPaths = `${repoDir}/**/*.{${FILE_EXTENSIONS_TO_PROCESS.join(',')}}`

  core.info('Scanning repository for images…')

  const imagePaths = await glob(globPaths, {
    ignore: config.ignorePaths.map((p: string) =>
      path.resolve(REPO_DIRECTORY!, p)
    ),
    nodir: true,
    follow: false,
    dot: true
  })

  core.info(`Found ${imagePaths.length} images in repository.`)

  return imagePaths
}

export default getRepositoryImages
