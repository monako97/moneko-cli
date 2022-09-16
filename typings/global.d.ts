declare global {
  var templates: Record<string, string>;
  var NEKOCLICONFIG: {
    CONFIG: {
      devServer: {
        port: number;
      };
    };
    log: (msg: any) => void;
  }
}

export {};
