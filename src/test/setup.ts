import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'

// @ts-ignore
global.indexedDB = indexedDB
// @ts-ignore
global.IDBKeyRange = IDBKeyRange

// This will be used for global API mocking
export const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
