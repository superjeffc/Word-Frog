module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: [],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  modulePathIgnorePatterns: ["<rootDir>/dictionary-worker/"],
};
