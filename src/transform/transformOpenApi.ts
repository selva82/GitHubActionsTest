import { AppError } from '../errors/AppError';
import { GatewayConfig, OpenApiDocument } from '../types';
import { createIntegration } from './integration';

export function transformOpenApi(document: OpenApiDocument, config: GatewayConfig): OpenApiDocument {
  const stage = config.aws['api-gateway'].rest.stages[0];
  const settings = stage.v0 ?? {};
  const integrationType = settings['integration-type'];
  if (integrationType === undefined) throw new AppError('Stage configuration must define integration-type.');

  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue;
      operation['x-amazon-apigateway-integration'] = createIntegration(integrationType, settings, method, path);
    }
  }
  return document;
}