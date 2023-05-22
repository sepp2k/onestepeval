module.exports = {
    collectCoverage: true,
    roots: ['<rootDir>/src'],
    coverageDirectory: 'coverage',
    coverageProvider: 'v8',
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 100,
            lines: 95,
            statements: 95,
        },
    },
    transform: {
        '^.+\\.(ts|tsx)$': 'ts-jest',
    },
};
