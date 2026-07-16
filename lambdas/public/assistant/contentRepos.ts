import {
  QueryCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { getApps, initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';

import type {
  BoardListItem,
  ContentRepositories,
  MathListItem,
  NewsDetailItem,
  NewsListItem,
} from './contentSearch.js';

export function createDynamoContentRepositories(
  documentClient: DynamoDBDocumentClient,
  postsTable: string,
  boardTable: string,
): Pick<ContentRepositories, 'listPublishedNews' | 'getNewsBySlug' | 'listBoardThreads'> {
  return {
    async listPublishedNews() {
      const result = await documentClient.send(new QueryCommand({
        TableName: postsTable,
        IndexName: 'gsi2',
        KeyConditionExpression: 'gsi2pk = :pk',
        ExpressionAttributeValues: { ':pk': 'PUBLISHED' },
        ScanIndexForward: false,
        Limit: 40,
      }));

      return (result.Items ?? []).flatMap((item): NewsListItem[] => {
        if (
          typeof item.postId !== 'string'
          || typeof item.slug !== 'string'
          || typeof item.title !== 'string'
        ) {
          return [];
        }
        return [{
          postId: item.postId,
          slug: item.slug,
          title: item.title,
          excerpt: typeof item.excerpt === 'string' ? item.excerpt : undefined,
          tags: Array.isArray(item.tags)
            ? item.tags.filter((tag): tag is string => typeof tag === 'string')
            : undefined,
          status: typeof item.status === 'string' ? item.status : 'published',
        }];
      });
    },

    async getNewsBySlug(slug) {
      const result = await documentClient.send(new QueryCommand({
        TableName: postsTable,
        IndexName: 'gsi1',
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: { ':pk': `SLUG#${slug}` },
        Limit: 1,
      }));
      const item = result.Items?.[0];
      if (
        !item
        || item.status !== 'published'
        || typeof item.postId !== 'string'
        || typeof item.slug !== 'string'
        || typeof item.title !== 'string'
      ) {
        return null;
      }

      return {
        postId: item.postId,
        slug: item.slug,
        title: item.title,
        excerpt: typeof item.excerpt === 'string' ? item.excerpt : undefined,
        content: typeof item.content === 'string' ? item.content : undefined,
        tags: Array.isArray(item.tags)
          ? item.tags.filter((tag): tag is string => typeof tag === 'string')
          : undefined,
        status: 'published',
      } satisfies NewsDetailItem;
    },

    async listBoardThreads() {
      const result = await documentClient.send(new QueryCommand({
        TableName: boardTable,
        IndexName: 'gsi1',
        KeyConditionExpression: 'gsi1pk = :pk',
        ExpressionAttributeValues: { ':pk': 'THREADS' },
        ScanIndexForward: false,
        Limit: 40,
      }));

      return (result.Items ?? []).flatMap((item): BoardListItem[] => {
        if (
          typeof item.threadId !== 'string'
          || typeof item.title !== 'string'
          || typeof item.body !== 'string'
        ) {
          return [];
        }
        return [{
          threadId: item.threadId,
          title: item.title,
          body: item.body,
        }];
      });
    },
  };
}

export function createMathContentRepository(
  firebaseConfig: { apiKey: string; projectId: string },
): Pick<ContentRepositories, 'listPublishedMathProblems'> {
  return {
    async listPublishedMathProblems() {
      try {
        const app = getApps()[0] ?? initializeApp({
          apiKey: firebaseConfig.apiKey,
          projectId: firebaseConfig.projectId,
        });
        const snapshot = await getDocs(collection(getFirestore(app), 'weeklyMath'));
        const problems: MathListItem[] = [];
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          if (data.problemPublished !== true) continue;
          if (typeof data.title !== 'string' || typeof data.problem !== 'string') continue;
          // Never include answer/explanation fields in the returned shape.
          problems.push({
            weekKey: docSnap.id,
            title: data.title,
            problem: data.problem,
            hint: typeof data.hint === 'string' ? data.hint : undefined,
            problemPublished: true,
          });
        }
        return problems;
      } catch {
        return [];
      }
    },
  };
}

export function createContentRepositories(input: {
  documentClient: DynamoDBDocumentClient;
  postsTable: string;
  boardTable: string;
  firebaseApiKey: string;
  firebaseProjectId: string;
}): ContentRepositories {
  return {
    ...createDynamoContentRepositories(
      input.documentClient,
      input.postsTable,
      input.boardTable,
    ),
    ...createMathContentRepository({
      apiKey: input.firebaseApiKey,
      projectId: input.firebaseProjectId,
    }),
  };
}
