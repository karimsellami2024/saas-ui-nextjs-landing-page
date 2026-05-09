"use client";

import React from "react";
import { Button, Link } from "@chakra-ui/react";

interface ReportDownloadProps {
  url: string;
}

export default function ReportDownload({ url }: ReportDownloadProps) {
  return (
    <Link href={url} isExternal _hover={{ textDecoration: "none" }}>
      <Button
        size="sm"
        bg="#344E41"
        color="white"
        _hover={{ bg: "#588157" }}
        leftIcon={<span>📥</span>}
        borderRadius="lg"
      >
        Télécharger le rapport PDF
      </Button>
    </Link>
  );
}
