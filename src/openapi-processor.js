export class OpenApiProcessingError extends Error {
    constructor(message) {
        super(message);
        this.name = 'OpenApiProcessingError';
    }
}
const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
export function processOpenApi(rawDocument) {
    validateDocument(rawDocument);
    const processed = structuredClone(rawDocument);
    for (const [path, pathItem] of Object.entries(processed.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
            if (!methods.has(method) || !operation || typeof operation !== 'object')
                continue;
            const metadata = operation['x-integration'];
            if (metadata === undefined)
                continue;
            if (!isIntegrationMetadata(metadata)) {
                throw new OpenApiProcessingError(`paths['${path}'].${method}.x-integration must be an object`);
            }
            const operationRecord = operation;
            operationRecord['x-amazon-apigateway-integration'] = createGatewayIntegration(metadata, method, path);
            delete operationRecord['x-integration'];
        }
    }
    return processed;
}
function validateDocument(document) {
    if (!document || typeof document !== 'object' || typeof document.openapi !== 'string') {
        throw new OpenApiProcessingError('The input must be an OpenAPI document with an openapi version');
    }
    if (!document.paths || typeof document.paths !== 'object' || Array.isArray(document.paths)) {
        throw new OpenApiProcessingError('The OpenAPI document must contain a paths object');
    }
}
function isIntegrationMetadata(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value) &&
        typeof value.type === 'string');
}
function required(metadata, key, location) {
    const value = metadata[key];
    if (typeof value !== 'string' || value.length === 0) {
        throw new OpenApiProcessingError(`${location}.${String(key)} is required for ${metadata.type}`);
    }
    return value;
}
function createGatewayIntegration(metadata, method, path) {
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
function optionalFields(metadata) {
    return Object.fromEntries(Object.entries({
        credentials: metadata.credentials,
        requestTemplates: metadata.requestTemplates,
        responses: metadata.responses
    }).filter(([, value]) => value !== undefined));
}
