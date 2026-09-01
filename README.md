# OpenAPI API Gateway processor

This pipeline converts the Swagger-generated `openapi.yml` into `openapi.processed.yml`, ready for import into Amazon API Gateway. The raw document remains unchanged.

## Design

Swagger adds operation-level `x-integration` metadata. The processor validates each operation and replaces that internal metadata with `x-amazon-apigateway-integration`:

| `x-integration.type` | API Gateway integration | Required fields |
| --- | --- | --- |
| `HTTP` | `http` over the internet | `uri` |
| `VPC_LINK` | `http_proxy` through a VPC Link | `uri`, `connectionId` |
| `LAMBDA` | `aws_proxy` Lambda invocation | `functionArn`, `region` |
| `AWS` | `aws` service integration | `uri` |

`httpMethod` defaults to the OpenAPI operation method for HTTP, VPC Link, and AWS. Lambda always uses `POST`, as required by the Lambda invocation API. Optional `credentials`, `requestTemplates`, and `responses` are passed through.

Example raw operation:

```yaml
x-integration:
  type: VPC_LINK
  uri: http://orders.internal/orders
  connectionId: vpclink-123
```

## Local usage

```text
npm install
npm test
npm run build
npm run process -- openapi.yml openapi.processed.yml
```

The command exits non-zero with a path-specific validation error for invalid metadata. The processor is pure and does not mutate the parsed raw document, making the transformation safe to use in CI and straightforward to unit test.