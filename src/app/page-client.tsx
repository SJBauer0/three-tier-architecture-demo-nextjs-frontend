"use client";

import { Box, Container, Stack, Typography } from "@mui/material";
import ArchitectureDiagramCard from "../components/ArchitectureDiagramCard";
import {
  InstanceInfo,
} from "../components/InstanceDetailsCard";
import StudentsTableCard from "../components/StudentsTableCard";
import TierConnectivityStepper from "../components/TierConnectivityStepper";

type HomeClientProps = {
  instanceInfo: InstanceInfo;
};

export default function HomeClient({ instanceInfo }: HomeClientProps) {
  return (
    <Box sx={{ minHeight: "100vh", px: 4, py: 10 }}>
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Stack spacing={1}>
            <Typography variant="h2" component="h1">
              Three-Tier Architecture Demo Test 1!!!
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              A single-page dashboard showcasing NextJS, NestJS, and PostgreSQL in a
              clean, observable flow.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Author: Emmanuel Romero
            </Typography>
          </Stack>

          <TierConnectivityStepper frontendInstance={instanceInfo} />

          {/* <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
            <BackendCheckCard />
            <DbCheckCard />
          </Stack> */}

          {/* <InstanceDetailsCard instanceInfo={instanceInfo} /> */}

          <StudentsTableCard />

          <ArchitectureDiagramCard />
        </Stack>
      </Container>
    </Box>
  );
}
