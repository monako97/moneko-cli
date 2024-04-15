declare global {
  var templates: Record<string, string>;
  var NEKOCLICONFIG: {
    CUSTOMCONFIG?: string;
    CONFIG: {
      devServer: {
        port: number;
      };
      modifyVars: Record<string, string>;
      env: Record<string, string>;
    };
  }
}

export {};
