import React from 'react';
import { Link as ChakraLink, Text } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

/** Same idea as App.jsx — never link emails or placeholder names. */
const looksLikeEmail = (value) =>
  typeof value === 'string' && value.includes('@') && value.includes('.');

const isPlaceholderUsername = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return false;
  if (/^YOUR_[A-Z0-9_]+$/i.test(trimmed)) return true;
  if (/^<.*>$/.test(trimmed)) return true;
  return false;
};

export const isLinkableUsername = (value) => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'Anonymous') return false;
  if (looksLikeEmail(trimmed) || isPlaceholderUsername(trimmed)) return false;
  return true;
};

/**
 * Leaderboard username that opens that player's public profile.
 * Falls back to plain text when the name isn't a real public username.
 */
const LeaderboardUsernameLink = ({ username, fontWeight = '400', ...rest }) => {
  const label = username || 'Anonymous';

  if (!isLinkableUsername(username)) {
    return (
      <Text as="span" fontWeight={fontWeight} {...rest}>
        {label}
      </Text>
    );
  }

  return (
    <ChakraLink
      as={RouterLink}
      to={`/profile/${encodeURIComponent(username.trim())}`}
      fontWeight={fontWeight}
      color="inherit"
      textDecoration="underline"
      textDecorationColor="transparent"
      _hover={{
        color: 'ink.400',
        textDecorationColor: 'ink.400',
      }}
      {...rest}
    >
      {username.trim()}
    </ChakraLink>
  );
};

export default LeaderboardUsernameLink;
