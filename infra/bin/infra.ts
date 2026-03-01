#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TtiAiStack } from '../lib/tti-ai-stack.js';

const app = new cdk.App();

new TtiAiStack(app, 'TtiAiStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    },
    description: 'TTI AI Club Website Infrastructure',
});
