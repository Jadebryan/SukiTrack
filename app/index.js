import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getSessionResumeHref } from '@/utils/authResumePath';

export default function Index() {
  const {
    authReady,
    sessionLoading,
    pinReady,
    pinUnlocked,
    hasPin,
    user,
  } = useAuth();

  if (!authReady || sessionLoading || !pinReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const href = getSessionResumeHref({ user, hasPin, pinUnlocked });
  return <Redirect href={href ?? '/welcome'} />;
}
