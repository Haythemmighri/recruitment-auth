// Mock implementation of passport module
// This prevents passport.use() errors during test imports

const passport = {
  use: jest.fn(function(strategy: any) {
    // Mock implementation — just store the strategy
    return this;
  }),
  authenticate: jest.fn((strategy: string, options: any) => {
    // Return a middleware function
    return (req: any, res: any, next: any) => {
      next();
    };
  }),
  serializeUser: jest.fn(function(fn: any) {
    return this;
  }),
  deserializeUser: jest.fn(function(fn: any) {
    return this;
  }),
};

module.exports = passport;
module.exports.default = passport;
