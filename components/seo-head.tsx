import { DEFAULT_ROBOTS } from '@/constants/seo';
import Head from 'expo-router/head';
import React from 'react';
import { Platform } from 'react-native';

export interface SeoHeadProps {
  title: string;
  description: string;
  canonicalUrl: string;
  robots?: string;
}

export function SeoHead({
  title,
  description,
  canonicalUrl,
  robots = DEFAULT_ROBOTS,
}: SeoHeadProps) {
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Head>
  );
}
