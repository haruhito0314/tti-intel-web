import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { describe, expect, it } from 'vitest';

import { TtiAiStack } from '../lib/tti-ai-stack.js';

type CloudFormationResource = {
    DeletionPolicy?: string;
    Type?: string;
    UpdateReplacePolicy?: string;
    Properties?: Record<string, unknown>;
};

type CloudFormationStatement = {
    Action?: string | string[];
    Condition?: Record<string, unknown>;
    Effect?: string;
    Resource?: unknown;
};

const app = new cdk.App();
const stack = new TtiAiStack(app, 'TestStack', {
    env: { account: '111111111111', region: 'ap-northeast-1' },
});
const template = Template.fromStack(stack);
const resources = template.toJSON().Resources as Record<string, CloudFormationResource>;

function resourcesOfType(type: string): [string, CloudFormationResource][] {
    return Object.entries(resources).filter(([, resource]) => resource.Type === type);
}

function onlyResourceWithPathPart(pathPart: string): [string, CloudFormationResource] {
    const matches = resourcesOfType('AWS::ApiGateway::Resource').filter(([, resource]) => {
        return resource.Properties?.PathPart === pathPart;
    });

    expect(matches, `API resource with PathPart ${pathPart}`).toHaveLength(1);
    return matches[0];
}

function methodsForResource(resourceLogicalId: string): CloudFormationResource[] {
    return resourcesOfType('AWS::ApiGateway::Method')
        .map(([, resource]) => resource)
        .filter((resource) => {
            const resourceId = resource.Properties?.ResourceId;
            return JSON.stringify(resourceId) === JSON.stringify({ Ref: resourceLogicalId });
        });
}

function actions(statement: CloudFormationStatement): string[] {
    if (Array.isArray(statement.Action)) {
        return statement.Action;
    }

    return statement.Action === undefined ? [] : [statement.Action];
}

function inlineStatementsForRole(roleLogicalId: string): CloudFormationStatement[] {
    return resourcesOfType('AWS::IAM::Policy')
        .map(([, resource]) => resource)
        .filter((resource) => {
            const roles = resource.Properties?.Roles;
            return Array.isArray(roles)
                && roles.some((role) => JSON.stringify(role) === JSON.stringify({ Ref: roleLogicalId }));
        })
        .flatMap((resource) => {
            const document = resource.Properties?.PolicyDocument as { Statement?: CloudFormationStatement[] };
            return document.Statement ?? [];
        });
}

describe('TtiAiStack site assistant infrastructure', () => {
    it('does not require an unconfigured external Cognito identity provider', () => {
        const clients = resourcesOfType('AWS::Cognito::UserPoolClient');

        expect(clients).toHaveLength(1);
        expect(clients[0][1].Properties?.SupportedIdentityProviders).toEqual([
            'COGNITO',
        ]);
        expect(JSON.stringify(clients[0][1])).not.toContain('Google');
        expect(resourcesOfType('AWS::Cognito::UserPoolIdentityProvider')).toHaveLength(0);
    });

    it('creates the retained on-demand assistant usage table with pk/sk and TTL', () => {
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: 'tti-ai-assistant-usage',
            BillingMode: 'PAY_PER_REQUEST',
            KeySchema: [
                { AttributeName: 'pk', KeyType: 'HASH' },
                { AttributeName: 'sk', KeyType: 'RANGE' },
            ],
            TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
        });

        const matches = resourcesOfType('AWS::DynamoDB::Table').filter(([, resource]) => {
            return resource.Properties?.TableName === 'tti-ai-assistant-usage';
        });
        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toMatchObject({
            DeletionPolicy: 'Retain',
            UpdateReplacePolicy: 'Retain',
        });
    });

    it('creates the retained unanswered-questions table with pk/sk and TTL', () => {
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: 'tti-ai-assistant-unanswered',
            BillingMode: 'PAY_PER_REQUEST',
            KeySchema: [
                { AttributeName: 'pk', KeyType: 'HASH' },
                { AttributeName: 'sk', KeyType: 'RANGE' },
            ],
            TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
        });

        const matches = resourcesOfType('AWS::DynamoDB::Table').filter(([, resource]) => {
            return resource.Properties?.TableName === 'tti-ai-assistant-unanswered';
        });
        expect(matches).toHaveLength(1);
        expect(matches[0][1]).toMatchObject({
            DeletionPolicy: 'Retain',
            UpdateReplacePolicy: 'Retain',
        });
    });

    it('configures the assistant Lambda with the required content-aware settings', () => {
        template.hasResourceProperties('AWS::Lambda::Function', {
            FunctionName: 'tti-ai-site-assistant',
            Runtime: 'nodejs22.x',
            Handler: 'index.handler',
            Timeout: 25,
            Environment: {
                Variables: Match.objectLike({
                    ASSISTANT_USAGE_TABLE: Match.anyValue(),
                    OPENAI_SECRET_ID: 'tti-ai/openai-api-key',
                    ASSISTANT_MODEL: 'gpt-5.4-nano-2026-03-17',
                    ASSISTANT_DAILY_LIMIT: '200',
                    ASSISTANT_SESSION_LIMIT: '20',
                    ASSISTANT_SESSION_WINDOW_SECONDS: '600',
                    ALLOWED_ORIGINS: 'https://tti-intel.com,https://www.tti-intel.com,http://localhost:5173,http://127.0.0.1:5173',
                    POSTS_TABLE: Match.anyValue(),
                    BOARD_TABLE: Match.anyValue(),
                    FIREBASE_API_KEY: Match.anyValue(),
                    FIREBASE_PROJECT_ID: 'tti-intel-d8d73',
                }),
            },
        });

        const usageTable = resourcesOfType('AWS::DynamoDB::Table').find(([, resource]) => {
            return resource.Properties?.TableName === 'tti-ai-assistant-usage';
        });
        const postsTable = resourcesOfType('AWS::DynamoDB::Table').find(([, resource]) => {
            return resource.Properties?.TableName === 'tti-ai-posts';
        });
        const boardTable = resourcesOfType('AWS::DynamoDB::Table').find(([, resource]) => {
            return resource.Properties?.TableName === 'tti-ai-board';
        });
        const assistantLambda = resourcesOfType('AWS::Lambda::Function').find(([, resource]) => {
            return resource.Properties?.FunctionName === 'tti-ai-site-assistant';
        });

        expect(usageTable).toBeDefined();
        expect(postsTable).toBeDefined();
        expect(boardTable).toBeDefined();
        expect(assistantLambda).toBeDefined();

        const variables = (
            assistantLambda?.[1].Properties?.Environment as { Variables?: Record<string, unknown> }
        ).Variables;
        expect(Object.keys(variables ?? {}).sort()).toEqual([
            'ALLOWED_ORIGINS',
            'ASSISTANT_DAILY_LIMIT',
            'ASSISTANT_MODEL',
            'ASSISTANT_SESSION_LIMIT',
            'ASSISTANT_SESSION_WINDOW_SECONDS',
            'ASSISTANT_USAGE_TABLE',
            'BOARD_TABLE',
            'FIREBASE_API_KEY',
            'FIREBASE_PROJECT_ID',
            'OPENAI_SECRET_ID',
            'POSTS_TABLE',
        ]);
        expect(variables?.ASSISTANT_USAGE_TABLE).toEqual({ Ref: usageTable?.[0] });
        expect(variables?.POSTS_TABLE).toEqual({ Ref: postsTable?.[0] });
        expect(variables?.BOARD_TABLE).toEqual({ Ref: boardTable?.[0] });
    });

    it('grants the assistant role quota-update, content-read, and secret-read access', () => {
        const usageTable = resourcesOfType('AWS::DynamoDB::Table').find(([, resource]) => {
            return resource.Properties?.TableName === 'tti-ai-assistant-usage';
        });
        const assistantLambda = resourcesOfType('AWS::Lambda::Function').find(([, resource]) => {
            return resource.Properties?.FunctionName === 'tti-ai-site-assistant';
        });

        expect(usageTable).toBeDefined();
        expect(assistantLambda).toBeDefined();

        const role = assistantLambda?.[1].Properties?.Role as { 'Fn::GetAtt'?: [string, string] };
        const roleLogicalId = role?.['Fn::GetAtt']?.[0];
        expect(roleLogicalId).toBeTypeOf('string');
        if (roleLogicalId === undefined) {
            throw new Error('Assistant Lambda role logical ID is missing');
        }

        const statements = inlineStatementsForRole(roleLogicalId);
        const dynamoActions = statements
            .flatMap((statement) => actions(statement))
            .filter((action) => action.startsWith('dynamodb:'));
        expect(dynamoActions).toEqual(expect.arrayContaining([
            'dynamodb:UpdateItem',
            'dynamodb:GetItem',
            'dynamodb:Query',
        ]));
        expect(dynamoActions).not.toContain('dynamodb:PutItem');

        const secretStatements = statements.filter((statement) => {
            return actions(statement).some((action) => action.startsWith('secretsmanager:'));
        });
        expect(secretStatements.length).toBeGreaterThanOrEqual(1);
        const secretBlob = JSON.stringify(secretStatements);
        expect(secretBlob).toContain('tti-ai/openai-api-key-??????');
        expect(secretBlob).not.toContain('firebase-service-account');

        expect(resourcesOfType('AWS::SecretsManager::Secret')).toHaveLength(0);
    });

    it('uses Lambda proxy integrations for only assistant POST and OPTIONS', () => {
        const [assistantLogicalId] = onlyResourceWithPathPart('assistant');
        const assistantMethods = methodsForResource(assistantLogicalId);
        const assistantLambda = resourcesOfType('AWS::Lambda::Function').find(([, resource]) => {
            return resource.Properties?.FunctionName === 'tti-ai-site-assistant';
        });

        expect(assistantLambda).toBeDefined();
        expect(assistantMethods.map((method) => method.Properties?.HttpMethod).sort()).toEqual([
            'OPTIONS',
            'POST',
        ]);
        for (const method of assistantMethods) {
            expect(method.Properties?.Integration).toMatchObject({ Type: 'AWS_PROXY' });
            expect(JSON.stringify(method.Properties?.Integration)).toContain(assistantLambda?.[0]);
        }

        for (const pathPart of ['posts', 'threads', 'contact']) {
            const [resourceLogicalId] = onlyResourceWithPathPart(pathPart);
            const optionsMethod = methodsForResource(resourceLogicalId).find((method) => {
                return method.Properties?.HttpMethod === 'OPTIONS';
            });
            expect(optionsMethod, `${pathPart} OPTIONS method`).toBeDefined();
            expect(optionsMethod?.Properties?.Integration).toMatchObject({ Type: 'MOCK' });
        }
    });

    it('limits throttling to assistant POST without adding an API-wide gateway response', () => {
        template.resourceCountIs('AWS::ApiGateway::GatewayResponse', 0);

        template.hasResourceProperties('AWS::ApiGateway::Stage', {
            MethodSettings: Match.arrayWith([
                Match.objectLike({
                    HttpMethod: '*',
                    ResourcePath: '/*',
                    ThrottlingBurstLimit: 200,
                    ThrottlingRateLimit: 100,
                }),
                Match.objectLike({
                    HttpMethod: 'POST',
                    ResourcePath: '/~1assistant',
                    ThrottlingBurstLimit: 4,
                    ThrottlingRateLimit: 2,
                }),
            ]),
        });

        expect(JSON.stringify(template.toJSON())).not.toContain('method.request.header.Origin');
    });

    it('preserves ApiUrl for VITE_API_BASE_URL', () => {
        const outputs = template.toJSON().Outputs as Record<string, { Description?: string; Value?: unknown }>;
        const restApis = resourcesOfType('AWS::ApiGateway::RestApi');
        const stages = resourcesOfType('AWS::ApiGateway::Stage');

        expect(restApis).toHaveLength(1);
        expect(stages).toHaveLength(1);
        expect(outputs.ApiUrl).toBeDefined();
        expect(outputs.ApiUrl.Description).toBe('Base URL for VITE_API_BASE_URL');
        expect(outputs.ApiUrl.Value).toEqual({
            'Fn::Join': [
                '',
                [
                    'https://',
                    { Ref: restApis[0][0] },
                    '.execute-api.ap-northeast-1.',
                    { Ref: 'AWS::URLSuffix' },
                    '/',
                    { Ref: stages[0][0] },
                    '/',
                ],
            ],
        });
    });
});
