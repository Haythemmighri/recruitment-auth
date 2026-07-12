/**
 * Manual Passport Mock
 */
module.exports = {
  use: jest.fn(function(strategy: any) { return this; }),
  initialize: jest.fn(() => (req: any, res: any, next: any) => next()),
  session: jest.fn(() => (req: any, res: any, next: any) => next()),
  authenticate: jest.fn((strategy: string, options: any) => (req: any, res: any, next: any) => next()),
  serializeUser: jest.fn(function(fn: any) { return this; }),
  deserializeUser: jest.fn(function(fn: any) { return this; }),
};
