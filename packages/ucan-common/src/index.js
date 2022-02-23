/* eslint-disable unicorn/no-null */

const uploadLevels = {
  'upload/*': 0,
  'upload/IMPORT': -1,
}
/**
 * @type {import('ucans').CapabilitySemantics<import('./types').StorageCapability>}
 */
export const storageSemantics = {
  tryParsing(cap) {
    if (typeof cap.with !== 'string') {
      return null
    }

    if (typeof cap.can !== 'string') {
      return null
    }

    if (cap.mh !== undefined && typeof cap.mh !== 'string') {
      return null
    }

    if (cap.can !== 'upload/*' && cap.can !== 'upload/IMPORT') {
      return null
    }

    if (cap.with.startsWith('storage://')) {
      return {
        with: cap.with,
        can: cap.can,
        mh: cap.mh,
      }
    }
    return null
  },

  tryDelegating(parentCap, childCap) {
    // check for unrelated caps

    // console.log('\n', childCap, '\n', parentCap)
    // must not escalate capability level
    if (uploadLevels[childCap.can] > uploadLevels[parentCap.can]) {
      // console.log('⚠️ Capability level escalation')
      return {
        escalation: 'Capability level escalation',
        capability: childCap,
      }
    }

    if (!childCap.with.includes(parentCap.with)) {
      // console.log('⚠️ Child resource does not match parent resource')
      return {
        escalation: 'Child resource does not match parent resource',
        capability: childCap,
      }
    }

    // if (childCap.with.length <= parentCap.with.length) {
    //   return {
    //     escalation: 'Child resource must be under parent resource',
    //     capability: childCap,
    //   }
    // }

    return childCap
  },
}
