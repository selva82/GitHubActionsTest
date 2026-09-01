import { writeFileSync } from 'node:fs';
import { dump } from 'js-yaml';
import { handleError } from './errors/handleError';
import { loadGatewayConfig, loadYamlFile } from './config/loadConfig';
import { transformOpenApi } from './transform/transformOpenApi';
import { OpenApiDocument } from './types';

const root = process.cwd();
const inputPath = `${root}/_fixtures_/openapi/openapi.yml`;
const configPath = `${root}/config/dev/awsapigateway.yml`;
const outputPath = `${root}/_fixtures_/openapi/processed/openapi.processed.yml`;

try {
  const document = loadYamlFile<OpenApiDocument>(inputPath);
  const config = loadGatewayConfig(configPath);
  writeFileSync(outputPath, dump(transformOpenApi(document, config), { noRefs: true, lineWidth: -1 }), 'utf8');
  console.log(`Processed OpenAPI written to ${outputPath}`);
} catch (error) {
  handleError(error);
}