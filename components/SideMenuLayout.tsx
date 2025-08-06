import { useState } from "react";
import {
  Box, Flex, VStack, Text, Button, Divider
} from "@chakra-ui/react";

// Ton tableau des catégories/titres
const categories = [
  {
    name: "Catégorie 1",
    color: "#5292b9",
    items: [
      "Émissions directes des sources de combustions fixes",
      "Émissions directes des sources de combustions mobiles",
      "Émissions directs provenant des procédés et élevages d'animaux",
      "Émissions fugitives directes (Réfrigérants)",
      "Émissions directes provenant de l’usage des sols (incluant agricoles) et de la foresterie",
    ],
  },
  // ... (ajoute ici les autres catégories comme dans le code précédent)
];

export function SideMenuLayout() {
  const [selected, setSelected] = useState({ cat: 0, item: 0 });

  return (
    <Flex minH="100vh" bg="#f5f7f5">
      {/* Sidebar */}
      <Box minW="300px" bg="white" borderRight="1px solid #ececec" p={4}>
        <VStack align="stretch" spacing={2}>
          {categories.map((cat, i) => (
            <Box key={cat.name}>
              <Text
                fontWeight="bold"
                color={cat.color}
                mb={2}
                fontSize="lg"
                letterSpacing="wider"
              >
                {cat.name}
              </Text>
              {cat.items.map((item, j) => (
                <Button
                  key={item}
                  onClick={() => setSelected({ cat: i, item: j })}
                  variant={selected.cat === i && selected.item === j ? "solid" : "ghost"}
                  colorScheme="gray"
                  justifyContent="flex-start"
                  w="100%"
                  size="sm"
                  bg={selected.cat === i && selected.item === j ? cat.color : "transparent"}
                  color={selected.cat === i && selected.item === j ? "white" : "black"}
                  _hover={{ bg: cat.color, color: "white" }}
                  mb={1}
                  rounded="md"
                >
                  {item}
                </Button>
              ))}
              <Divider my={2} />
            </Box>
          ))}
        </VStack>
      </Box>
      {/* Content principal à droite */}
      <Box flex="1" p={10}>
        <Text fontSize="2xl" fontWeight="bold" color={categories[selected.cat].color}>
          {categories[selected.cat].items[selected.item]}
        </Text>
        <Box mt={6} p={6} bg="white" rounded="xl" boxShadow="lg">
          {/* C’est ici que tu mets le contenu spécifique à chaque sheet */}
          <Text>
            Affiche ici le formulaire ou composant correspondant à :<br />
            <b>{categories[selected.cat].items[selected.item]}</b>
          </Text>
        </Box>
      </Box>
    </Flex>
  );
}
