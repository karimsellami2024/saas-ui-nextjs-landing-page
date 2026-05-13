'use client';
import React from 'react';
import { Box, Button, Flex, HStack, Text } from '@chakra-ui/react';

interface AutomationImportBannerProps {
  count: number;
  onImport: () => void;
  onDismiss: () => void;
}

const INK   = '#1F3D2E';
const GREEN = '#EAF1EC';
const SANS  = "'Manrope', system-ui, sans-serif";

export function AutomationImportBanner({ count, onImport, onDismiss }: AutomationImportBannerProps) {
  return (
    <Box
      bg={GREEN}
      border="1px solid"
      borderColor="#C8DDD0"
      rounded="xl"
      px={5}
      py={3}
      mb={4}
    >
      <Flex align="center" justify="space-between" gap={4} flexWrap="wrap">
        <HStack spacing={2}>
          <Text fontSize="18px" lineHeight={1}>⚡</Text>
          <Text fontFamily={SANS} fontSize="13px" fontWeight={600} color={INK}>
            {count} facture{count > 1 ? 's' : ''} disponible{count > 1 ? 's' : ''} depuis l'automatisation
          </Text>
        </HStack>
        <HStack spacing={2}>
          <Button
            size="sm"
            bg={INK}
            color="white"
            fontFamily={SANS}
            fontWeight={600}
            fontSize="12px"
            px={4}
            rounded="full"
            _hover={{ opacity: 0.88 }}
            onClick={onImport}
          >
            Importer les données
          </Button>
          <Button
            size="sm"
            variant="ghost"
            color={INK}
            fontFamily={SANS}
            fontWeight={500}
            fontSize="12px"
            px={3}
            rounded="full"
            _hover={{ bg: '#D9E8DD' }}
            onClick={onDismiss}
          >
            Ignorer
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
}
