"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TtiAiStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const path = __importStar(require("path"));
class TtiAiStack extends cdk.Stack {
    constructor(scope, id, props) {
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
                cognito.UserPoolClientIdentityProvider.GOOGLE,
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
        sendContactLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: ['*'], // Restrict to specific identities in production
        }));
        // =====================
        // API Gateway
        // =====================
        const api = new apigateway.RestApi(this, 'TtiAiApi', {
            restApiName: 'TTI AI Club API',
            description: 'API for TTI AI Club Website',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization', 'X-Device-Id'],
            },
            deployOptions: {
                stageName: 'prod',
                throttlingRateLimit: 100,
                throttlingBurstLimit: 200,
            },
        });
        // Public API Endpoints
        const postsResource = api.root.addResource('posts');
        postsResource.addMethod('GET', new apigateway.LambdaIntegration(getPostsLambda));
        const postSlugResource = postsResource.addResource('{slug}');
        postSlugResource.addMethod('GET', new apigateway.LambdaIntegration(getPostLambda));
        const threadsResource = api.root.addResource('threads');
        threadsResource.addMethod('GET', new apigateway.LambdaIntegration(getThreadsLambda));
        threadsResource.addMethod('POST', new apigateway.LambdaIntegration(createThreadLambda));
        const threadIdResource = threadsResource.addResource('{id}');
        threadIdResource.addMethod('GET', new apigateway.LambdaIntegration(getThreadLambda));
        const commentsResource = threadIdResource.addResource('comments');
        commentsResource.addMethod('POST', new apigateway.LambdaIntegration(createCommentLambda));
        const contactResource = api.root.addResource('contact');
        contactResource.addMethod('POST', new apigateway.LambdaIntegration(sendContactLambda));
        // =====================
        // Outputs
        // =====================
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL',
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
exports.TtiAiStack = TtiAiStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHRpLWFpLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3R0aS1haS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsbUVBQXFEO0FBQ3JELGlFQUFtRDtBQUNuRCwrREFBaUQ7QUFDakQsdUVBQXlEO0FBQ3pELHVEQUF5QztBQUN6Qyx5REFBMkM7QUFFM0MsMkNBQTZCO0FBRTdCLE1BQWEsVUFBVyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3JDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsd0JBQXdCO1FBQ3hCLGtCQUFrQjtRQUNsQix3QkFBd0I7UUFFeEIsY0FBYztRQUNkLE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3RELFNBQVMsRUFBRSxjQUFjO1lBQ3pCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ2pFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQzVELFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsTUFBTTtTQUMxQyxDQUFDLENBQUM7UUFFSCxzQkFBc0I7UUFDdEIsVUFBVSxDQUFDLHVCQUF1QixDQUFDO1lBQy9CLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxh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QUFVLFNBQVMsSUFBSSxDQUFDLE1BQU0sb0JBQW9CO1lBQzNFLFdBQVcsRUFBRSwwQkFBMEI7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsWUFBWSxDQUFDLFVBQVU7WUFDOUIsV0FBVyxFQUFFLHNCQUFzQjtTQUN0QyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQ0o7QUF6VUQsZ0NBeVVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIFR0aUFpU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIER5bmFtb0RCIFRhYmxlc1xuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT1cblxuICAgICAgICAvLyBQb3N0cyBUYWJsZVxuICAgICAgICBjb25zdCBwb3N0c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdQb3N0c1RhYmxlJywge1xuICAgICAgICAgICAgdGFibGVOYW1lOiAndHRpLWFpLXBvc3RzJyxcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncGsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnc2snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gR1NJIGZvciBzbHVnIGxvb2t1cFxuICAgICAgICBwb3N0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgICAgICAgIGluZGV4TmFtZTogJ2dzaTEnLFxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdnc2kxcGsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnZ3NpMXNrJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEdTSSBmb3IgcHVibGlzaGVkIHBvc3RzIGxpc3RcbiAgICAgICAgcG9zdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICAgICAgICBpbmRleE5hbWU6ICdnc2kyJyxcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZ3NpMnBrJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2dzaTJzaycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCb2FyZCBUYWJsZSAoU2luZ2xlIFRhYmxlIERlc2lnbilcbiAgICAgICAgY29uc3QgYm9hcmRUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQm9hcmRUYWJsZScsIHtcbiAgICAgICAgICAgIHRhYmxlTmFtZTogJ3R0aS1haS1ib2FyZCcsXG4gICAgICAgICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3BrJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3NrJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEdTSSBmb3IgdGhyZWFkIGxpc3RpbmdcbiAgICAgICAgYm9hcmRUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICAgICAgICBpbmRleE5hbWU6ICdnc2kxJyxcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZ3NpMXBrJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgICAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2dzaTFzaycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZG1pbiBEZXZpY2VzIFRhYmxlXG4gICAgICAgIGNvbnN0IGFkbWluRGV2aWNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBZG1pbkRldmljZXNUYWJsZScsIHtcbiAgICAgICAgICAgIHRhYmxlTmFtZTogJ3R0aS1haS1hZG1pbi1kZXZpY2VzJyxcbiAgICAgICAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncGsnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICAgICAgc29ydEtleTogeyBuYW1lOiAnc2snLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVnaXN0cmF0aW9uIENvZGVzIFRhYmxlICh3aXRoIFRUTClcbiAgICAgICAgY29uc3QgcmVnaXN0cmF0aW9uQ29kZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUmVnaXN0cmF0aW9uQ29kZXNUYWJsZScsIHtcbiAgICAgICAgICAgIHRhYmxlTmFtZTogJ3R0aS1haS1yZWdpc3RyYXRpb24tY29kZXMnLFxuICAgICAgICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdwaycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgICAgICBzb3J0S2V5OiB7IG5hbWU6ICdzaycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICAgICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgICAgICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ2V4cGlyZXNBdCcsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICAvLyBTMyBCdWNrZXQgZm9yIEltYWdlc1xuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT1cblxuICAgICAgICBjb25zdCBpbWFnZXNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdJbWFnZXNCdWNrZXQnLCB7XG4gICAgICAgICAgICBidWNrZXROYW1lOiBgdHRpLWFpLWltYWdlcy0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgICAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcbiAgICAgICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICAgICAgICAgIGNvcnM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcbiAgICAgICAgICAgICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsIHMzLkh0dHBNZXRob2RzLlBVVF0sXG4gICAgICAgICAgICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgLy8gV2lsbCBiZSByZXN0cmljdGVkIGluIHByb2R1Y3Rpb25cbiAgICAgICAgICAgICAgICAgICAgbWF4QWdlOiAzNjAwLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT1cbiAgICAgICAgLy8gQ29nbml0byBVc2VyIFBvb2xcbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09XG5cbiAgICAgICAgY29uc3QgdXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCAnVXNlclBvb2wnLCB7XG4gICAgICAgICAgICB1c2VyUG9vbE5hbWU6ICd0dGktYWktdXNlci1wb29sJyxcbiAgICAgICAgICAgIHNlbGZTaWduVXBFbmFibGVkOiBmYWxzZSwgLy8gT25seSBmZWRlcmF0ZWQgb3IgYWRtaW4tY3JlYXRlZCB1c2Vyc1xuICAgICAgICAgICAgc2lnbkluQWxpYXNlczogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgICAgICAgYXV0b1ZlcmlmeTogeyBlbWFpbDogdHJ1ZSB9LFxuICAgICAgICAgICAgc3RhbmRhcmRBdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgZW1haWw6IHsgcmVxdWlyZWQ6IHRydWUsIG11dGFibGU6IHRydWUgfSxcbiAgICAgICAgICAgICAgICBmdWxsbmFtZTogeyByZXF1aXJlZDogZmFsc2UsIG11dGFibGU6IHRydWUgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXG4gICAgICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkbWlucyBHcm91cFxuICAgICAgICBjb25zdCBhZG1pbnNHcm91cCA9IG5ldyBjb2duaXRvLkNmblVzZXJQb29sR3JvdXAodGhpcywgJ0FkbWluc0dyb3VwJywge1xuICAgICAgICAgICAgdXNlclBvb2xJZDogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgICAgIGdyb3VwTmFtZTogJ0FkbWlucycsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FkbWluaXN0cmF0b3IgZ3JvdXAgd2l0aCBmdWxsIGFjY2VzcycsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVzZXIgUG9vbCBDbGllbnRcbiAgICAgICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnVXNlclBvb2xDbGllbnQnLCB7XG4gICAgICAgICAgICB1c2VyUG9vbCxcbiAgICAgICAgICAgIHVzZXJQb29sQ2xpZW50TmFtZTogJ3R0aS1haS13ZWItY2xpZW50JyxcbiAgICAgICAgICAgIGF1dGhGbG93czoge1xuICAgICAgICAgICAgICAgIHVzZXJQYXNzd29yZDogZmFsc2UsXG4gICAgICAgICAgICAgICAgdXNlclNycDogZmFsc2UsXG4gICAgICAgICAgICAgICAgY3VzdG9tOiBmYWxzZSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvQXV0aDoge1xuICAgICAgICAgICAgICAgIGZsb3dzOiB7XG4gICAgICAgICAgICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IHRydWUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzY29wZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLk9QRU5JRCxcbiAgICAgICAgICAgICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLkVNQUlMLFxuICAgICAgICAgICAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuUFJPRklMRSxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrVXJsczogW1xuICAgICAgICAgICAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDo1MTczL2FkbWluJyxcbiAgICAgICAgICAgICAgICAgICAgJ2h0dHBzOi8veW91ci1kb21haW4uY29tL2FkbWluJywgLy8gVXBkYXRlIGluIHByb2R1Y3Rpb25cbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGxvZ291dFVybHM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MycsXG4gICAgICAgICAgICAgICAgICAgICdodHRwczovL3lvdXItZG9tYWluLmNvbScsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdXBwb3J0ZWRJZGVudGl0eVByb3ZpZGVyczogW1xuICAgICAgICAgICAgICAgIGNvZ25pdG8uVXNlclBvb2xDbGllbnRJZGVudGl0eVByb3ZpZGVyLkdPT0dMRSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBnZW5lcmF0ZVNlY3JldDogZmFsc2UsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFVzZXIgUG9vbCBEb21haW5cbiAgICAgICAgY29uc3QgdXNlclBvb2xEb21haW4gPSB1c2VyUG9vbC5hZGREb21haW4oJ1VzZXJQb29sRG9tYWluJywge1xuICAgICAgICAgICAgY29nbml0b0RvbWFpbjoge1xuICAgICAgICAgICAgICAgIGRvbWFpblByZWZpeDogYHR0aS1haS0ke3RoaXMuYWNjb3VudH1gLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIExhbWJkYSBGdW5jdGlvbnMgKFB1YmxpYyBBUEkpXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgICAgIGNvbnN0IGxhbWJkYXNEaXIgPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vbGFtYmRhcycpO1xuXG4gICAgICAgIC8vIENvbW1vbiBMYW1iZGEgZW52aXJvbm1lbnQgdmFyaWFibGVzXG4gICAgICAgIGNvbnN0IGNvbW1vbkVudiA9IHtcbiAgICAgICAgICAgIFBPU1RTX1RBQkxFOiBwb3N0c1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICAgIEJPQVJEX1RBQkxFOiBib2FyZFRhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICAgIEFETUlOX0RFVklDRVNfVEFCTEU6IGFkbWluRGV2aWNlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgICAgIFJFR0lTVFJBVElPTl9DT0RFU19UQUJMRTogcmVnaXN0cmF0aW9uQ29kZXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgICBJTUFHRVNfQlVDS0VUOiBpbWFnZXNCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgICAgIFVTRVJfUE9PTF9JRDogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBHZXQgUG9zdHMgTGFtYmRhXG4gICAgICAgIGNvbnN0IGdldFBvc3RzTGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0UG9zdHNMYW1iZGEnLCB7XG4gICAgICAgICAgICBmdW5jdGlvbk5hbWU6ICd0dGktYWktZ2V0LXBvc3RzJyxcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihsYW1iZGFzRGlyLCAncHVibGljL2dldFBvc3RzJykpLFxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IGNvbW1vbkVudixcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgICAgfSk7XG4gICAgICAgIHBvc3RzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQb3N0c0xhbWJkYSk7XG5cbiAgICAgICAgLy8gR2V0IFBvc3QgYnkgU2x1ZyBMYW1iZGFcbiAgICAgICAgY29uc3QgZ2V0UG9zdExhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFBvc3RMYW1iZGEnLCB7XG4gICAgICAgICAgICBmdW5jdGlvbk5hbWU6ICd0dGktYWktZ2V0LXBvc3QnLFxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIyX1gsXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKGxhbWJkYXNEaXIsICdwdWJsaWMvZ2V0UG9zdCcpKSxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiBjb21tb25FbnYsXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICAgIH0pO1xuICAgICAgICBwb3N0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0UG9zdExhbWJkYSk7XG5cbiAgICAgICAgLy8gR2V0IFRocmVhZHMgTGFtYmRhXG4gICAgICAgIGNvbnN0IGdldFRocmVhZHNMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRUaHJlYWRzTGFtYmRhJywge1xuICAgICAgICAgICAgZnVuY3Rpb25OYW1lOiAndHRpLWFpLWdldC10aHJlYWRzJyxcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihsYW1iZGFzRGlyLCAncHVibGljL2dldFRocmVhZHMnKSksXG4gICAgICAgICAgICBlbnZpcm9ubWVudDogY29tbW9uRW52LFxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgICB9KTtcbiAgICAgICAgYm9hcmRUYWJsZS5ncmFudFJlYWREYXRhKGdldFRocmVhZHNMYW1iZGEpO1xuXG4gICAgICAgIC8vIEdldCBUaHJlYWQgTGFtYmRhXG4gICAgICAgIGNvbnN0IGdldFRocmVhZExhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFRocmVhZExhbWJkYScsIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogJ3R0aS1haS1nZXQtdGhyZWFkJyxcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihsYW1iZGFzRGlyLCAncHVibGljL2dldFRocmVhZCcpKSxcbiAgICAgICAgICAgIGVudmlyb25tZW50OiBjb21tb25FbnYsXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICAgIH0pO1xuICAgICAgICBib2FyZFRhYmxlLmdyYW50UmVhZERhdGEoZ2V0VGhyZWFkTGFtYmRhKTtcblxuICAgICAgICAvLyBDcmVhdGUgVGhyZWFkIExhbWJkYVxuICAgICAgICBjb25zdCBjcmVhdGVUaHJlYWRMYW1iZGEgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDcmVhdGVUaHJlYWRMYW1iZGEnLCB7XG4gICAgICAgICAgICBmdW5jdGlvbk5hbWU6ICd0dGktYWktY3JlYXRlLXRocmVhZCcsXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4obGFtYmRhc0RpciwgJ3B1YmxpYy9jcmVhdGVUaHJlYWQnKSksXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgICAgIC4uLmNvbW1vbkVudixcbiAgICAgICAgICAgICAgICBSQVRFX0xJTUlUX1NFQ1JFVDogJ2NoYW5nZS10aGlzLWluLXByb2R1Y3Rpb24nLCAvLyBVc2UgU2VjcmV0cyBNYW5hZ2VyIGluIHByb2R1Y3Rpb25cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICAgIH0pO1xuICAgICAgICBib2FyZFRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVUaHJlYWRMYW1iZGEpO1xuXG4gICAgICAgIC8vIENyZWF0ZSBDb21tZW50IExhbWJkYVxuICAgICAgICBjb25zdCBjcmVhdGVDb21tZW50TGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlQ29tbWVudExhbWJkYScsIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uTmFtZTogJ3R0aS1haS1jcmVhdGUtY29tbWVudCcsXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjJfWCxcbiAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4obGFtYmRhc0RpciwgJ3B1YmxpYy9jcmVhdGVDb21tZW50JykpLFxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgICAgICAuLi5jb21tb25FbnYsXG4gICAgICAgICAgICAgICAgUkFURV9MSU1JVF9TRUNSRVQ6ICdjaGFuZ2UtdGhpcy1pbi1wcm9kdWN0aW9uJyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICAgIH0pO1xuICAgICAgICBib2FyZFRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVDb21tZW50TGFtYmRhKTtcblxuICAgICAgICAvLyBTZW5kIENvbnRhY3QgTGFtYmRhXG4gICAgICAgIGNvbnN0IHNlbmRDb250YWN0TGFtYmRhID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnU2VuZENvbnRhY3RMYW1iZGEnLCB7XG4gICAgICAgICAgICBmdW5jdGlvbk5hbWU6ICd0dGktYWktc2VuZC1jb250YWN0JyxcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihsYW1iZGFzRGlyLCAncHVibGljL3NlbmRDb250YWN0JykpLFxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAgICAgICAuLi5jb21tb25FbnYsXG4gICAgICAgICAgICAgICAgU0VTX0ZST01fRU1BSUw6ICdhaS1jbHViQHRveW90YS10aS5hYy5qcCcsIC8vIFVwZGF0ZSB3aXRoIHZlcmlmaWVkIGVtYWlsXG4gICAgICAgICAgICAgICAgU0VTX1RPX0VNQUlMOiAnYWktY2x1YkB0b3lvdGEtdGkuYWMuanAnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDE1KSxcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIEdyYW50IFNFUyBwZXJtaXNzaW9uc1xuICAgICAgICBzZW5kQ29udGFjdExhbWJkYS5hZGRUb1JvbGVQb2xpY3koXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgICAgYWN0aW9uczogWydzZXM6U2VuZEVtYWlsJywgJ3NlczpTZW5kUmF3RW1haWwnXSxcbiAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddLCAvLyBSZXN0cmljdCB0byBzcGVjaWZpYyBpZGVudGl0aWVzIGluIHByb2R1Y3Rpb25cbiAgICAgICAgICAgIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09XG4gICAgICAgIC8vIEFQSSBHYXRld2F5XG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ1R0aUFpQXBpJywge1xuICAgICAgICAgICAgcmVzdEFwaU5hbWU6ICdUVEkgQUkgQ2x1YiBBUEknLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBUEkgZm9yIFRUSSBBSSBDbHViIFdlYnNpdGUnLFxuICAgICAgICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXG4gICAgICAgICAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgICAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJywgJ1gtRGV2aWNlLUlkJ10sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICAgICAgICAgIHN0YWdlTmFtZTogJ3Byb2QnLFxuICAgICAgICAgICAgICAgIHRocm90dGxpbmdSYXRlTGltaXQ6IDEwMCxcbiAgICAgICAgICAgICAgICB0aHJvdHRsaW5nQnVyc3RMaW1pdDogMjAwLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUHVibGljIEFQSSBFbmRwb2ludHNcbiAgICAgICAgY29uc3QgcG9zdHNSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdwb3N0cycpO1xuICAgICAgICBwb3N0c1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0UG9zdHNMYW1iZGEpKTtcblxuICAgICAgICBjb25zdCBwb3N0U2x1Z1Jlc291cmNlID0gcG9zdHNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne3NsdWd9Jyk7XG4gICAgICAgIHBvc3RTbHVnUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihnZXRQb3N0TGFtYmRhKSk7XG5cbiAgICAgICAgY29uc3QgdGhyZWFkc1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3RocmVhZHMnKTtcbiAgICAgICAgdGhyZWFkc1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0VGhyZWFkc0xhbWJkYSkpO1xuICAgICAgICB0aHJlYWRzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3JlYXRlVGhyZWFkTGFtYmRhKSk7XG5cbiAgICAgICAgY29uc3QgdGhyZWFkSWRSZXNvdXJjZSA9IHRocmVhZHNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2lkfScpO1xuICAgICAgICB0aHJlYWRJZFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2V0VGhyZWFkTGFtYmRhKSk7XG5cbiAgICAgICAgY29uc3QgY29tbWVudHNSZXNvdXJjZSA9IHRocmVhZElkUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2NvbW1lbnRzJyk7XG4gICAgICAgIGNvbW1lbnRzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oY3JlYXRlQ29tbWVudExhbWJkYSkpO1xuXG4gICAgICAgIGNvbnN0IGNvbnRhY3RSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdjb250YWN0Jyk7XG4gICAgICAgIGNvbnRhY3RSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihzZW5kQ29udGFjdExhbWJkYSkpO1xuXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PVxuICAgICAgICAvLyBPdXRwdXRzXG4gICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PVxuXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XG4gICAgICAgICAgICB2YWx1ZTogYXBpLnVybCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sSWQnLCB7XG4gICAgICAgICAgICB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQnLFxuICAgICAgICB9KTtcblxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xDbGllbnRJZCcsIHtcbiAgICAgICAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxuICAgICAgICB9KTtcblxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29nbml0b0RvbWFpbicsIHtcbiAgICAgICAgICAgIHZhbHVlOiBgJHt1c2VyUG9vbERvbWFpbi5kb21haW5OYW1lfS5hdXRoLiR7dGhpcy5yZWdpb259LmFtYXpvbmNvZ25pdG8uY29tYCxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBIb3N0ZWQgVUkgRG9tYWluJyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0ltYWdlc0J1Y2tldE5hbWUnLCB7XG4gICAgICAgICAgICB2YWx1ZTogaW1hZ2VzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1MzIEJ1Y2tldCBmb3IgSW1hZ2VzJyxcbiAgICAgICAgfSk7XG4gICAgfVxufVxuIl19