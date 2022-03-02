/* eslint-disable unicorn/no-null */

import {
  CapabilityEscalationError,
  CapabilityParseError,
  CapabilityUnrelatedError,
} from './errors.js'

const uploadLevels = {
  'upload/*': 0,
  'upload/IMPORT': -1,
}

const PREFIX = 'storage://'
/**
 * @type {import('./types').CapabilitySemantics<import('./types').StorageSemantics>}
 */
export const storageSemantics = {
  tryParsing(cap) {
    if (typeof cap.with !== 'string') {
      return new CapabilityParseError('"with" must be a string.', cap)
    }

    if (typeof cap.can !== 'string') {
      return new CapabilityParseError('"can" must be a string.', cap)
    }

    if (cap.mh !== undefined && typeof cap.mh !== 'string') {
      return new CapabilityParseError(
        '"mh" must be a string or undefined.',
        cap
      )
    }

    if (cap.can !== 'upload/*' && cap.can !== 'upload/IMPORT') {
      return new CapabilityParseError(
        `Ability ${cap.can} is not supported.`,
        cap
      )
    }

    if (cap.with.startsWith('storage://')) {
      return {
        with: cap.with,
        can: cap.can,
        mh: cap.mh,
      }
    }

    return new CapabilityParseError('Capability is not supported.', cap)
  },

  tryDelegating(parentCap, childCap) {
    // check for unrelated caps
    if (
      !parentCap.with.startsWith(PREFIX) ||
      !childCap.with.startsWith(PREFIX)
    ) {
      return new CapabilityUnrelatedError(parentCap, childCap)
    }

    // must not escalate capability level
    if (uploadLevels[childCap.can] > uploadLevels[parentCap.can]) {
      // console.log('\n', childCap, '\n', parentCap)
      // console.log('⚠️ Capability level escalation')

      return new CapabilityEscalationError(
        'Capability level escalation',
        parentCap,
        childCap
      )
    }

    if (!childCap.with.includes(parentCap.with)) {
      // console.log('\n', childCap, '\n', parentCap)
      // console.log('⚠️ Child resource does not match parent resource')
      return new CapabilityEscalationError(
        'Child resource does not match parent resource',
        parentCap,
        childCap
      )
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
