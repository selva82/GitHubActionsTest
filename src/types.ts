export type IntegrationType = 'VPCLINK' | 'HTTP' | 'LAMBDA' | 'AWSSERVICE';

export interface GatewayStageConfig {
  name: string;
  description?: string;
  v0?: Record<string, unknown>;
}

export interface GatewayConfig {
  aws: {
    'api-gateway': {
      rest: { stages: GatewayStageConfig[] };
    };
  };
}

export type OpenApiDocument = Record<string, unknown> & {
  paths: Record<string, Record<string, Record<string, unknown>>>;
};