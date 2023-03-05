#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WanderersLegacyStack } from '../lib/wanderers-legacy';

const app = new cdk.App();
new WanderersLegacyStack(app, 'WanderersLegacyStack', {});
