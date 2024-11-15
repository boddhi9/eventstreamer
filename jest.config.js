export const preset = 'ts-jest/presets/default';
export const globals = {
  'ts-jest': {
    tsConfig: {
      allowJs: true,
      module: 'commonjs',
    },
  },
};
