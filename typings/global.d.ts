declare global {
  var templates: Record<string, string>;
  var NEKOCLICONFIG: {
    CONFIG: {
      devServer: {
        port: number;
      };
      modifyVars: Record<string, string>;
    };
  }
}

export {};
