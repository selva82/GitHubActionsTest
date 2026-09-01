import { describe, expect, it } from 'vitest';
import { OpenApiProcessingError, processOpenApi } from '../src/openapi-processor.js';
const rawDocument = {
    openapi: '3.0.3',
    info: { title: 'Orders', version: '1.0.0' },
    paths: {
        '/orders': {
            get: {
                responses: { '200': { description: 'ok' } },
                'x-integration': {
                    type: 'HTTP',
                    uri: 'https://orders.internal.example.com/orders',
                    connectionId: 'unused-for-http'
                }
            },
            post: {
                responses: { '201': { description: 'created' } },
                'x-integration': {
                    type: 'VPC_LINK',
                    uri: 'http://orders.internal/orders',
                    connectionId: 'vpclink-123'
                }
            }
        },
        '/orders/lambda': {
            post: {
                responses: { '200': { description: 'ok' } },
                'x-integration': {
                    type: 'LAMBDA',
                    functionArn: 'arn:aws:lambda:us-east-1:123456789012:function:orders',
                    region: 'us-east-1'
                }
            }
        },
        '/orders/aws': {
            get: {
                responses: { '200': { description: 'ok' } },
                'x-integration': {
                    type: 'AWS',
                    uri: 'arn:aws:apigateway:us-east-1:sqs:path/123456789012/orders',
                    httpMethod: 'POST',
                    credentials: 'arn:aws:iam::123456789012:role/api-gateway'
                }
            }
        }
    }
};
describe('processOpenApi', () => {
    it('adds the correct API Gateway extension for every supported integration', () => {
        const processed = processOpenApi(rawDocument);
        const orders = processed.paths['/orders'];
        const getIntegration = (operation) => operation['x-amazon-apigateway-integration'];
        expect(getIntegration(orders.get)).toEqual({
            type: 'http',
            httpMethod: 'GET',
            uri: 'https://orders.internal.example.com/orders',
            connectionType: 'INTERNET'
        });
        expect(getIntegration(orders.post)).toMatchObject({
            type: 'http_proxy',
            httpMethod: 'POST',
            connectionType: 'VPC_LINK',
            connectionId: 'vpclink-123'
        });
        expect(getIntegration(processed.paths['/orders/lambda'].post)).toMatchObject({
            type: 'aws_proxy',
            httpMethod: 'POST',
            uri: 'arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:orders/invocations'
        });
        expect(getIntegration(processed.paths['/orders/aws'].get)).toMatchObject({
            type: 'aws',
            httpMethod: 'POST',
            credentials: 'arn:aws:iam::123456789012:role/api-gateway'
        });
    });
    it('does not mutate the raw document or leak internal metadata', () => {
        const processed = processOpenApi(rawDocument);
        expect(rawDocument.paths['/orders'].get['x-amazon-apigateway-integration']).toBeUndefined();
        expect(processed.paths['/orders'].get['x-integration']).toBeUndefined();
    });
    it('fails with an actionable error for incomplete integration metadata', () => {
        expect(() => processOpenApi({ ...rawDocument, paths: { '/bad': { get: {
                        responses: { '200': { description: 'ok' } },
                        'x-integration': { type: 'VPC_LINK', uri: 'http://internal' }
                    } } } })).toThrowError(new OpenApiProcessingError("paths['/bad'].get.x-integration.connectionId is required for VPC_LINK"));
    });
});
