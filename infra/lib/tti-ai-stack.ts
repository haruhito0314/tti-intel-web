import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';

export class TtiAiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // =====================
        // DynamoDB Tables
        // =====================

        // Posts Table
        const postsTable = new dynamodb.Table(this, 'PostsTable', {
            tableName: 'tti-ai-posts',
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // GSI for slug lookup
        postsTable.addGlobalSecondaryIndex({
            indexName: 'gsi1',
            partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // GSI for published posts list
        postsTable.addGlobalSecondaryIndex({
            indexName: 'gsi2',
            partitionKey: { name: 'gsi2pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'gsi2sk', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // Board Table (Single Table Design)
        const boardTable = new dynamodb.Table(this, 'BoardTable', {
            tableName: 'tti-ai-board',
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // GSI for thread listing
        boardTable.addGlobalSecondaryIndex({
            indexName: 'gsi1',
            partitionKey: { name: 'gsi1pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'gsi1sk', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        // Admin Devices Table
        const adminDevicesTable = new dynamodb.Table(this, 'AdminDevicesTable', {
            tableName: 'tti-ai-admin-devices',
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Registration Codes Table (with TTL)
        const registrationCodesTable = new dynamodb.Table(this, 'RegistrationCodesTable', {
            tableName: 'tti-ai-registration-codes',
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            timeToLiveAttribute: 'expiresAt',
        });

        const assistantUsageTable = new dynamodb.Table(this, 'AssistantUsageTable', {
            tableName: 'tti-ai-assistant-usage',
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'expiresAt',
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        const assistantUnansweredTable = new dynamodb.Table(this, 'AssistantUnansweredTable', {
            tableName: 'tti-ai-assistant-unanswered',
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            timeToLiveAttribute: 'expiresAt',
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // =====================
        // S3 Bucket for Images
        // =====================

        const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
            bucketName: `tti-ai-images-${this.account}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            cors: [
                {
                    allowedHeaders: ['*'],
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
                    allowedOrigins: ['*'], // Will be restricted in production
                    maxAge: 3600,
                },
            ],
        });

        // =====================
        // Cognito User Pool
        // =====================

        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'tti-ai-user-pool',
            selfSignUpEnabled: false, // Only federated or admin-created users
            signInAliases: { email: true },
            autoVerify: { email: true },
            standardAttributes: {
                email: { required: true, mutable: true },
                fullname: { required: false, mutable: true },
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });

        // Admins Group
        const adminsGroup = new cognito.CfnUserPoolGroup(this, 'AdminsGroup', {
            userPoolId: userPool.userPoolId,
            groupName: 'Admins',
            description: 'Administrator group with full access',
        });

        // User Pool Client
        const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            userPoolClientName: 'tti-ai-web-client',
            authFlows: {
                userPassword: false,
                userSrp: false,
                custom: false,
            },
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.PROFILE,
                ],
                callbackUrls: [
                    'http://localhost:5173/admin',
                    'https://your-domain.com/admin', // Update in production
                ],
                logoutUrls: [
                    'http://localhost:5173',
                    'https://your-domain.com',
                ],
            },
            supportedIdentityProviders: [
                cognito.UserPoolClientIdentityProvider.COGNITO,
            ],
            generateSecret: false,
        });

        // User Pool Domain
        const userPoolDomain = userPool.addDomain('UserPoolDomain', {
            cognitoDomain: {
                domainPrefix: `tti-ai-${this.account}`,
            },
        });

        // =====================
        // Lambda Functions (Public API)
        // =====================

        const lambdasDir = path.join(__dirname, '../../lambdas');

        const openAiSecret = secretsmanager.Secret.fromSecretNameV2(
            this,
            'OpenAiApiKeySecret',
            'tti-ai/openai-api-key',
        );

        const assistantLambda = new nodejs.NodejsFunction(this, 'AssistantLambda', {
            functionName: 'tti-ai-site-assistant',
            runtime: lambda.Runtime.NODEJS_22_X,
            entry: path.join(lambdasDir, 'public/assistant/index.ts'),
            handler: 'handler',
            projectRoot: lambdasDir,
            depsLockFilePath: path.join(lambdasDir, 'package-lock.json'),
            timeout: cdk.Duration.seconds(25),
            environment: {
                ASSISTANT_USAGE_TABLE: assistantUsageTable.tableName,
                ASSISTANT_UNANSWERED_TABLE: assistantUnansweredTable.tableName,
                OPENAI_SECRET_ID: openAiSecret.secretName,
                ASSISTANT_MODEL: 'gpt-5-nano',
                ASSISTANT_SMALL_TALK_MODEL: 'gpt-5-nano',
                ASSISTANT_DAILY_LIMIT: '100',
                ASSISTANT_SESSION_LIMIT: '20',
                ASSISTANT_SESSION_WINDOW_SECONDS: '600',
                ALLOWED_ORIGINS: 'https://tti-intel.com,https://www.tti-intel.com,http://localhost:5173,http://127.0.0.1:5173',
                POSTS_TABLE: postsTable.tableName,
                BOARD_TABLE: boardTable.tableName,
                // Public web config (same values as the frontend). Not a secret.
                FIREBASE_API_KEY: 'AIzaSyBs1W-j8Dj7tmh-TLth0pvdWLTs6wLEhaQ',
                FIREBASE_PROJECT_ID: 'tti-intel-d8d73',
            },
            bundling: {
                target: 'node22',
                externalModules: ['@aws-sdk/*'],
                sourceMap: true,
            },
        });

        assistantLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['dynamodb:UpdateItem'],
            resources: [assistantUsageTable.tableArn],
            conditions: {
                StringEquals: {
                    'dynamodb:EnclosingOperation': 'TransactWriteItems',
                },
            },
        }));

        postsTable.grantReadData(assistantLambda);
        boardTable.grantReadData(assistantLambda);
        assistantUnansweredTable.grantWriteData(assistantLambda);

        assistantLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [
                this.formatArn({
                    service: 'secretsmanager',
                    resource: 'secret',
                    resourceName: 'tti-ai/openai-api-key-??????',
                    arnFormat: cdk.ArnFormat.COLON_RESOURCE_NAME,
                }),
            ],
        }));

        // Common Lambda environment variables
        const commonEnv = {
            POSTS_TABLE: postsTable.tableName,
            BOARD_TABLE: boardTable.tableName,
            ADMIN_DEVICES_TABLE: adminDevicesTable.tableName,
            REGISTRATION_CODES_TABLE: registrationCodesTable.tableName,
            IMAGES_BUCKET: imagesBucket.bucketName,
            USER_POOL_ID: userPool.userPoolId,
        };

        // Get Posts Lambda
        const getPostsLambda = new lambda.Function(this, 'GetPostsLambda', {
            functionName: 'tti-ai-get-posts',
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(lambdasDir, 'public/getPosts')),
            environment: commonEnv,
            timeout: cdk.Duration.seconds(10),
        });
        postsTable.grantReadData(getPostsLambda);

        // Get Post by Slug Lambda
        const getPostLambda = new lambda.Function(this, 'GetPostLambda', {
            functionName: 'tti-ai-get-post',
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(lambdasDir, 'public/getPost')),
            environment: commonEnv,
            timeout: cdk.Duration.seconds(10),
        });
        postsTable.grantReadData(getPostLambda);

        // Get Threads Lambda
        const getThreadsLambda = new lambda.Function(this, 'GetThreadsLambda', {
            functionName: 'tti-ai-get-threads',
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(lambdasDir, 'public/getThreads')),
            environment: commonEnv,
            timeout: cdk.Duration.seconds(10),
        });
        boardTable.grantReadData(getThreadsLambda);

        // Get Thread Lambda
        const getThreadLambda = new lambda.Function(this, 'GetThreadLambda', {
            functionName: 'tti-ai-get-thread',
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(lambdasDir, 'public/getThread')),
            environment: commonEnv,
            timeout: cdk.Duration.seconds(10),
        });
        boardTable.grantReadData(getThreadLambda);

        // Create Thread Lambda
        const createThreadLambda = new lambda.Function(this, 'CreateThreadLambda', {
            functionName: 'tti-ai-create-thread',
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(lambdasDir, 'public/createThread')),
            environment: {
                ...commonEnv,
                RATE_LIMIT_SECRET: 'change-this-in-production', // Use Secrets Manager in production
            },
            timeout: cdk.Duration.seconds(10),
        });
        boardTable.grantReadWriteData(createThreadLambda);

        // Create Comment Lambda
        const createCommentLambda = new lambda.Function(this, 'CreateCommentLambda', {
            functionName: 'tti-ai-create-comment',
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(lambdasDir, 'public/createComment')),
            environment: {
                ...commonEnv,
                RATE_LIMIT_SECRET: 'change-this-in-production',
            },
            timeout: cdk.Duration.seconds(10),
        });
        boardTable.grantReadWriteData(createCommentLambda);

        // Send Contact Lambda
        const sendContactLambda = new lambda.Function(this, 'SendContactLambda', {
            functionName: 'tti-ai-send-contact',
            runtime: lambda.Runtime.NODEJS_22_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(lambdasDir, 'public/sendContact')),
            environment: {
                ...commonEnv,
                SES_FROM_EMAIL: 'ai-club@toyota-ti.ac.jp', // Update with verified email
                SES_TO_EMAIL: 'ai-club@toyota-ti.ac.jp',
            },
            timeout: cdk.Duration.seconds(15),
        });
        // Grant SES permissions
        sendContactLambda.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ['ses:SendEmail', 'ses:SendRawEmail'],
                resources: ['*'], // Restrict to specific identities in production
            })
        );

        // =====================
        // API Gateway
        // =====================

        const publicCors: apigateway.CorsOptions = {
            allowOrigins: apigateway.Cors.ALL_ORIGINS,
            allowMethods: apigateway.Cors.ALL_METHODS,
            allowHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
        };

        const api = new apigateway.RestApi(this, 'TtiAiApi', {
            restApiName: 'TTI AI Club API',
            description: 'API for TTI AI Club Website',
            deployOptions: {
                stageName: 'prod',
                throttlingRateLimit: 100,
                throttlingBurstLimit: 200,
                methodOptions: {
                    '/assistant/POST': {
                        throttlingRateLimit: 2,
                        throttlingBurstLimit: 4,
                    },
                },
            },
        });

        // Public API Endpoints
        const postsResource = api.root.addResource('posts', {
            defaultCorsPreflightOptions: publicCors,
        });
        postsResource.addMethod('GET', new apigateway.LambdaIntegration(getPostsLambda));

        const postSlugResource = postsResource.addResource('{slug}');
        postSlugResource.addMethod('GET', new apigateway.LambdaIntegration(getPostLambda));

        const threadsResource = api.root.addResource('threads', {
            defaultCorsPreflightOptions: publicCors,
        });
        threadsResource.addMethod('GET', new apigateway.LambdaIntegration(getThreadsLambda));
        threadsResource.addMethod('POST', new apigateway.LambdaIntegration(createThreadLambda));

        const threadIdResource = threadsResource.addResource('{id}');
        threadIdResource.addMethod('GET', new apigateway.LambdaIntegration(getThreadLambda));

        const commentsResource = threadIdResource.addResource('comments');
        commentsResource.addMethod('POST', new apigateway.LambdaIntegration(createCommentLambda));

        const contactResource = api.root.addResource('contact', {
            defaultCorsPreflightOptions: publicCors,
        });
        contactResource.addMethod('POST', new apigateway.LambdaIntegration(sendContactLambda));

        const assistantIntegration = new apigateway.LambdaIntegration(assistantLambda);
        const assistantResource = api.root.addResource('assistant');
        assistantResource.addMethod('OPTIONS', assistantIntegration);
        assistantResource.addMethod('POST', assistantIntegration);

        // =====================
        // Outputs
        // =====================

        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'Base URL for VITE_API_BASE_URL',
        });

        new cdk.CfnOutput(this, 'UserPoolId', {
            value: userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
        });

        new cdk.CfnOutput(this, 'CognitoDomain', {
            value: `${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
            description: 'Cognito Hosted UI Domain',
        });

        new cdk.CfnOutput(this, 'ImagesBucketName', {
            value: imagesBucket.bucketName,
            description: 'S3 Bucket for Images',
        });
    }
}
