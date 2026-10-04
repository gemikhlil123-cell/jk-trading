/**
 * Tests for the password policy and the temporary-password generator used when a
 * mentor restores access for a locked-out student.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  checkPassword, generateTempPassword,
  PASSWORD_MIN_LENGTH, PASSWORD_MAX_BYTES, PASSWORD_PROBLEM_TEXT,
} from '../lib/password-policy'

test('a password of the minimum length is accepted and one shorter is not', () => {
  assert.equal(checkPassword('a'.repeat(PASSWORD_MIN_LENGTH)), null)
  assert.equal(checkPassword('a'.repeat(PASSWORD_MIN_LENGTH - 1)), 'too_short')
  assert.equal(checkPassword(''), 'too_short')
})

test('non-string input is rejected rather than coerced', () => {
  for (const v of [undefined, null, 12345678, {}, ['password1']]) {
    assert.equal(checkPassword(v), 'too_short')
  }
})

test('leading or trailing whitespace is rejected, inner spaces are fine', () => {
  assert.equal(checkPassword(' password1'), 'edge_whitespace')
  assert.equal(checkPassword('password1 '), 'edge_whitespace')
  assert.equal(checkPassword('password1\n'), 'edge_whitespace')
  assert.equal(checkPassword('        '), 'edge_whitespace')
  assert.equal(checkPassword('pass word 1'), null)
})

test('the length limit is measured in bytes, because bcrypt truncates at 72', () => {
  assert.equal(checkPassword('a'.repeat(PASSWORD_MAX_BYTES)), null)
  assert.equal(checkPassword('a'.repeat(PASSWORD_MAX_BYTES + 1)), 'too_long')
  // Arabic letters take two bytes each: 36 fit, 37 do not.
  assert.equal(checkPassword('م'.repeat(36)), null)
  assert.equal(checkPassword('م'.repeat(37)), 'too_long')
})

test('minimum length counts characters, not UTF-16 units', () => {
  // Eight emoji are eight characters even though each is two UTF-16 units.
  assert.equal(checkPassword('😀'.repeat(8)), null)
  assert.equal(checkPassword('😀'.repeat(4)), 'too_short')
})

test('every problem has a message for the user', () => {
  for (const key of ['too_short', 'too_long', 'edge_whitespace'] as const) {
    assert.ok(PASSWORD_PROBLEM_TEXT[key].length > 0)
  }
})

test('a generated temporary password has the readable grouped shape', () => {
  for (let i = 0; i < 200; i++) {
    assert.match(generateTempPassword(), /^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/)
  }
})

test('generated passwords avoid characters that get misread', () => {
  for (let i = 0; i < 500; i++) {
    assert.doesNotMatch(generateTempPassword(), /[0O1lIo]/)
  }
})

test('generated passwords pass the policy and do not repeat', () => {
  const seen = new Set<string>()
  for (let i = 0; i < 500; i++) {
    const p = generateTempPassword()
    assert.equal(checkPassword(p), null)
    assert.ok(!seen.has(p), 'temporary password repeated')
    seen.add(p)
  }
})

test('the generator honours a custom shape', () => {
  assert.match(generateTempPassword(2, 5), /^[A-Za-z2-9]{5}-[A-Za-z2-9]{5}$/)
})
