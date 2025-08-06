import { Box, Text } from "@chakra-ui/react";

export function HiddenPostePlaceholder({ label }: { label?: string }) {
  return (
    <Box
      p={8}
      border="2px dashed #B2D235"
      bg="#F8FAF5"
      borderRadius="lg"
      minH="200px"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      my={6}
    >
      <Text fontSize="lg" color="#00496F" fontWeight="bold">
        {label ? `Section "${label}" masquée` : "Cette section est masquée"}
      </Text>
      <Text color="#19516C" mt={2} fontSize="md">
        Cette fonctionnalité a été désactivée pour votre compte. 
        Contactez un administrateur si vous pensez qu'il s'agit d'une erreur.
      </Text>
    </Box>
  );
}
