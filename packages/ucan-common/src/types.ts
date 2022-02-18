export interface StorageCapability {
  with: string
  can: 'upload/IMPORT' | 'upload/*'
  /**
   * Constrain an import by [multihash](https://github.com/multiformats/multihash)
   */
  mh?: string
}
