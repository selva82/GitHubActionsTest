import assert from 'node:assert/strict';
import test from 'node:test';
import { transformOpenApi } from '../src/transform/transformOpenApi';
import { GatewayConfig, OpenApiDocument } from '../src/types';

const createDocument = (): OpenApiDocument => ({ paths: { '/users': { get: {}, post: {} } } });
const createConfig = (type: string): GatewayConfig => ({
  aws: { 'api-gateway': { rest: { stages: [{ name: 'dev', v0: { 'integration-type': type } }] } } }
});

test('adds VPC link integrations to every HTTP operation', () => {
  const result = transformOpenApi(createDocument(), createConfig('vpc-link'));
  assert.deepEqual(result.paths['/users'].get['x-amazon-apigateway-integration'], {
    type: 'http_proxy', httpMethod: 'GET', connectionType: 'VPC_LINK',
    connectionId: '${stageVariables.vpcLinkId}', uri: '${stageVariables.backendUrl}/users'
  });
});

test('supports all declared integration types', () => {
  for (const type of ['VPCLINK', 'HTTP', 'LAMBDA', 'AWSSERVICE']) {
    const typeConfig = createConfig(type);
    typeConfig.aws['api-gateway'].rest.stages[0].v0 = { 'integration-type': type };
    assert.ok(transformOpenApi({ paths: { '/x': { get: {} } } }, typeConfig).paths['/x'].get['x-amazon-apigateway-integration']);
  }
});