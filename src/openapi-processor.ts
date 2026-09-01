export type IntegrationType = 'VPC_LINK' | 'LAMBDA' | 'HTTP' | 'AWS';

export interface IntegrationMetadata {
  type: IntegrationType;
  uri?: string;
  connectionId?: string;
  functionArn?: string;
  region?: string;
  httpMethod?: string;
  credentials?: string;
  requestTemplates?: Record<string, string>;
  responses?: Record<string, unknown>;
}

export class OpenApiProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenApiProcessingError';
  }
}

type OpenApiDocument = {
  openapi: string;
  paths: Record<string, Record<string, Record<string, unknown>>>;
  [key: string]: unknown;
};

const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

export function processOpenApi<T extends Record<string, unknown>>(rawDocument: T): T {
  validateDocument(rawDocument);
  const processed = structuredClone(rawDocument) as T & OpenApiDocument;

  for (const [path, pathItem] of Object.entries(processed.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!methods.has(method) || !operation || typeof operation !== 'object') continue;
      const metadata = (operation as Record<string, unknown>)['x-integration'];
      if (metadata === undefined) continue;
      if (!isIntegrationMetadata(metadata)) {
        throw new OpenApiProcessingError(`paths['${path}'].${method}.x-integration must be an object`);
      }
      const operationRecord = operation as Record<string, unknown>;
      operationRecord['x-amazon-apigateway-integration'] = createGatewayIntegration(metadata, method, path);
      delete operationRecord['x-integration'];
    }
  }
  return processed;
}

function validateDocument(document: Record<string, unknown>): asserts document is OpenApiDocument {
  if (!document || typeof document !== 'object' || typeof document.openapi !== 'string') {
    throw new OpenApiProcessingError('The input must be an OpenAPI document with an openapi version');
  }
  if (!document.paths || typeof document.paths !== 'object' || Array.isArray(document.paths)) {
    throw new OpenApiProcessingError('The OpenAPI document must contain a paths object');
  }
}

function isIntegrationMetadata(value: unknown): value is IntegrationMetadata {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).type === 'string');
}

function required(metadata: IntegrationMetadata, key: keyof IntegrationMetadata, location: string): string {
  const value = metadata[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new OpenApiProcessingError(`${location}.${String(key)} is required for ${metadata.type}`);
  }
  return value;
}

function createGatewayIntegration(metadata: IntegrationMetadata, method: string, path: string): Record<string, unknown> {
  const location = `paths['${path}'].${method}.x-integration`;
  const httpMethod = (metadata.httpMethod ?? method).toUpperCase();
  switch (metadata.type) {
    case 'HTTP':
      return { type: 'http', httpMethod, uri: required(metadata, 'uri', location), connectionType: 'INTERNET' };
    case 'VPC_LINK':
      return { type: 'http_proxy', httpMethod, uri: required(metadata, 'uri', location), connectionType: 'VPC_LINK', connectionId: required(metadata, 'connectionId', location) };
    case 'LAMBDA': {
      const region = required(metadata, 'region', location);
      const functionArn = required(metadata, 'functionArn', location);
      return { type: 'aws_proxy', httpMethod: 'POST', uri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${functionArn}/invocations`, ...optionalFields(metadata) };
    }
    case 'AWS':
      return { type: 'aws', httpMethod, uri: required(metadata, 'uri', location), ...optionalFields(metadata) };
    default:
      throw new OpenApiProcessingError(`${location}.type must be one of VPC_LINK, LAMBDA, HTTP, AWS`);
  }
}

function optionalFields(metadata: IntegrationMetadata): Record<string, unknown> {
  return Object.fromEntries(Object.entries({
    credentials: metadata.credentials,
    requestTemplates: metadata.requestTemplates,
    responses: metadata.responses
  }).filter(([, value]) => value !== undefined));
}