/**
 * @template S
 *
 */
export class CapabilityEscalationError extends Error {
  /**
   * @param {string} msg
   * @param {S} parent
   * @param {S} child
   */
  constructor(msg, parent, child) {
    super(msg)
    this.parent = parent
    this.child = child
  }
}

CapabilityEscalationError.CODE = 'ERROR_CAPABILITY_ESCALATION'

/**
 * @template S
 *
 */
export class CapabilityUnrelatedError extends Error {
  /**
   * @param {S} parent
   * @param {S} child
   */
  constructor(parent, child) {
    super('Capabilities are unrelated.')
    this.parent = parent
    this.child = child
  }
}

CapabilityUnrelatedError.CODE = 'ERROR_CAPABILITY_UNRELEATED'

export class CapabilityParseError extends Error {
  /**
   * @param {string} msg
   * @param {import('./types.js').Capability} cap
   */
  constructor(msg, cap) {
    super(msg)
    this.cap = cap
  }
}

CapabilityParseError.CODE = 'ERROR_CAPABILITY_PARSE'
