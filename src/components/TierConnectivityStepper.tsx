"use client";

import {
    CheckCircle,
    CloudDone,
    CloudOff,
    ErrorOutline,
    Hub,
    Language,
    Storage,
    Sync,
} from "@mui/icons-material";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Paper,
    Stack,
    Step,
    StepConnector,
    stepConnectorClasses,
    StepLabel,
    Stepper,
    styled,
    Tooltip,
    Typography,
} from "@mui/material";
import Image from "next/image";
import { useEffect, useState } from "react";

const API_BASE = "/api/proxy";

/* ---------- types ---------- */

type InstanceInfo = {
    hostname: string;
    podName: string | null;
    podIp: string | null;
    nodeName: string | null;
};

type CheckStatus = "idle" | "checking" | "ok" | "error";
type SeedActionStatus = "idle" | "seeding" | "success" | "error";

type TierConnectivityStepperProps = {
    frontendInstance: InstanceInfo;
};

/* ---------- styled connector ---------- */

const TierConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
        top: 28,
    },
    [`& .${stepConnectorClasses.line}`]: {
        height: 3,
        border: 0,
        backgroundColor: theme.palette.grey[300],
        borderRadius: 2,
    },
    [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line}`]: {
        backgroundColor: theme.palette.primary.main,
    },
    [`&.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: {
        backgroundColor: theme.palette.success.main,
    },
}));

/* ---------- styled icon wrapper ---------- */

const IconRoot = styled("div")<{
    ownerState: { active: boolean; completed: boolean; error: boolean };
}>(({ theme, ownerState }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    borderRadius: "50%",
    color: "#fff",
    backgroundColor: theme.palette.grey[300],
    ...(ownerState.active && {
        backgroundColor: theme.palette.primary.main,
        boxShadow: `0 4px 16px ${theme.palette.primary.main}55`,
    }),
    ...(ownerState.completed && {
        backgroundColor: theme.palette.success.main,
    }),
    ...(ownerState.error && {
        backgroundColor: theme.palette.error.main,
    }),
}));

/* ---------- step icon component ---------- */

function TierStepIcon(props: {
    active: boolean;
    completed: boolean;
    error: boolean;
    icon: React.ReactNode;
    stepIndex: number;
}) {
    const { active, completed, error, stepIndex } = props;

    const icons: Record<number, React.ReactElement> = {
        0: <Language />,
        1: <CloudDone />,
        2: <Storage />,
    };

    return (
        <IconRoot ownerState={{ active, completed, error }}>
            {completed ? <CheckCircle /> : error ? <ErrorOutline /> : icons[stepIndex]}
        </IconRoot>
    );
}

/* ---------- helpers ---------- */

const displayValue = (value: string | null | undefined) =>
    value && value.trim() !== "" ? value : "—";

const chipConfig: Record<
    CheckStatus,
    { color: "default" | "warning" | "success" | "error"; icon: React.ReactElement }
> = {
    idle: { color: "default", icon: <Sync fontSize="small" /> },
    checking: { color: "warning", icon: <CircularProgress size={16} /> },
    ok: { color: "success", icon: <CloudDone fontSize="small" /> },
    error: { color: "error", icon: <CloudOff fontSize="small" /> },
};

const chipLabel: Record<CheckStatus, string> = {
    idle: "Not checked",
    checking: "Checking…",
    ok: "Connected",
    error: "Unreachable",
};

/* ---------- detail row ---------- */

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <Paper
            variant="outlined"
            sx={{
                p: 1.25,
                borderRadius: 1,
                minWidth: 0,
                bgcolor: "background.paper",
            }}
        >
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                {label}
            </Typography>
            <Typography
                variant="body2"
                sx={{
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    lineHeight: 1.35,
                }}
            >
                {value}
            </Typography>
        </Paper>
    );
}

/* ---------- main component ---------- */

export default function TierConnectivityStepper({
    frontendInstance,
}: TierConnectivityStepperProps) {
    /* ---- backend state ---- */
    const [backendStatus, setBackendStatus] = useState<CheckStatus>("idle");
    const [backendInstance, setBackendInstance] = useState<InstanceInfo | null>(null);
    const [backendLastCheck, setBackendLastCheck] = useState<string | null>(null);

    /* ---- db state ---- */
    const [dbStatus, setDbStatus] = useState<CheckStatus>("idle");
    const [dbLastCheck, setDbLastCheck] = useState<string | null>(null);
    const [dbSeeded, setDbSeeded] = useState<boolean | null>(null);
    const [dbSeededAt, setDbSeededAt] = useState<string | null>(null);
    const [seedActionStatus, setSeedActionStatus] = useState<SeedActionStatus>("idle");
    const [seedActionMessage, setSeedActionMessage] = useState<string | null>(null);

    /* ---- backend check ---- */
    const checkBackend = async () => {
        setBackendStatus("checking");
        setBackendInstance(null);
        try {
            const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
            if (!res.ok) throw new Error();
            const data = await res.json().catch(() => null);
            setBackendStatus("ok");
            setBackendInstance(data?.instance ?? null);
        } catch {
            setBackendStatus("error");
        }
        setBackendLastCheck(new Date().toLocaleString());
    };

    /* ---- db check ---- */
    const checkDb = async () => {
        setDbStatus("checking");
        setSeedActionMessage(null);
        try {
            const res = await fetch(`${API_BASE}/health/db`, { cache: "no-store" });
            if (!res.ok) throw new Error();
            const data = await res.json().catch(() => null);
            setDbStatus("ok");
            setDbSeeded(typeof data?.seeded === "boolean" ? data.seeded : null);
            setDbSeededAt(data?.seededAt ?? null);
        } catch {
            setDbStatus("error");
            setDbSeeded(null);
            setDbSeededAt(null);
        }
        setDbLastCheck(new Date().toLocaleString());
    };

    const seedDatabaseOnce = async () => {
        setSeedActionStatus("seeding");
        setSeedActionMessage(null);
        try {
            const response = await fetch(`${API_BASE}/health/db/seed-once`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                const fallback =
                    response.status === 409
                        ? "Database is already seeded."
                        : "Unable to seed the database.";
                throw new Error(payload?.message ?? fallback);
            }
            setSeedActionStatus("success");
            setSeedActionMessage("Database seeded successfully.");
            setDbSeeded(true);
            setDbSeededAt(new Date().toISOString());
            await checkDb();
        } catch (error) {
            setSeedActionStatus("error");
            setSeedActionMessage(
                error instanceof Error ? error.message : "Unable to seed the database."
            );
        }
    };

    /* ---- auto-check on mount ---- */
    useEffect(() => {
        checkBackend();
    }, []);

    useEffect(() => {
        if (backendStatus === "ok") checkDb();
        if (backendStatus === "error") {
            setDbStatus("idle");
            setDbLastCheck(null);
            setDbSeeded(null);
            setDbSeededAt(null);
            setSeedActionStatus("idle");
            setSeedActionMessage(null);
        }
    }, [backendStatus]);

    const seedButtonDisabled =
        backendStatus !== "ok" ||
        dbStatus !== "ok" ||
        dbSeeded === true ||
        seedActionStatus === "seeding";

    const seedButtonTooltip =
        backendStatus !== "ok"
            ? "Backend connection is required first."
            : dbStatus !== "ok"
                ? "Database connection is required first."
                : dbSeeded
                    ? "Database already seeded."
                    : seedActionStatus === "seeding"
                        ? "Seeding in progress."
                        : "Seed students data one time.";

    const seededLabel =
        dbSeeded === true ? "Seeded" : dbSeeded === false ? "Not seeded" : "Unknown";
    const seededColor =
        dbSeeded === true ? "success" : dbSeeded === false ? "warning" : "default";

    /* ---- derived active step ---- */
    const activeStep =
        dbStatus === "ok" ? 3 : backendStatus === "ok" ? 2 : backendStatus === "error" ? 1 : 1;

    /* ---- step completed / error flags ---- */
    const stepState = [
        { completed: true, error: false },
        {
            completed: backendStatus === "ok",
            error: backendStatus === "error",
        },
        {
            completed: dbStatus === "ok",
            error: dbStatus === "error",
        },
    ];

    const labels = [
        "Frontend (Web Tier)",
        "Backend (App Tier)",
        "Database (Data Tier)",
    ];

    return (
        <Paper sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={3}>
                {/* ---------- header ---------- */}
                <Stack direction="row" spacing={1} alignItems="center">
                    <Hub color="primary" />
                    <Typography variant="h6">Tier Connectivity Test 5</Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                    Real-time connectivity status across the three-tier architecture.
                </Typography>

                {/* ---------- stepper ---------- */}
                <Stepper
                    alternativeLabel
                    activeStep={activeStep}
                    connector={<TierConnector />}
                    sx={{ pt: 1 }}
                >
                    {labels.map((label, index) => (
                        <Step
                            key={label}
                            completed={stepState[index].completed}
                        >
                            <StepLabel
                                error={stepState[index].error}
                                StepIconComponent={(iconProps) => (
                                    <TierStepIcon
                                        active={iconProps.active ?? false}
                                        completed={iconProps.completed ?? false}
                                        error={iconProps.error ?? false}
                                        icon={iconProps.icon}
                                        stepIndex={index}
                                    />
                                )}
                            >
                                {label}
                            </StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {/* ---------- detail panels ---------- */}
                <Box
                    sx={{
                        mt: 1,
                        display: "grid",
                        gap: 2,
                        gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
                        alignItems: "stretch",
                    }}
                >
                    {/* ---- frontend panel ---- */}
                    <Paper
                        variant="outlined"
                        sx={{
                            minHeight: { xs: "auto", md: 470 },
                            p: 2.5,
                            border: "1px solid",
                            borderColor: "success.light",
                            borderRadius: 1,
                            boxShadow: "none",
                            display: "flex",
                        }}
                    >
                        <Stack spacing={2} sx={{ width: "100%", height: "100%" }}>
                            <Stack direction="column" spacing={1} alignItems="center">
                                <Image
                                    src="/logos/NextJS.svg"
                                    alt="Next.js"
                                    width={70}
                                    height={70}
                                    style={{ width: "auto", height: "auto", maxHeight: 100 }}
                                />
                                <Typography variant="subtitle2">Next.js</Typography>
                                <Chip
                                    label="Running"
                                    color="success"
                                    size="medium"
                                    variant="outlined"
                                    icon={<CheckCircle fontSize="small" />}
                                />
                            </Stack>

                            <Box
                                sx={{
                                    display: "grid",
                                    gap: 1,
                                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                                }}
                            >
                                <DetailItem label="Hostname" value={displayValue(frontendInstance.hostname)} />
                                <DetailItem label="Pod name" value={displayValue(frontendInstance.podName)} />
                                <DetailItem label="Pod IP" value={displayValue(frontendInstance.podIp)} />
                                <DetailItem label="Node name" value={displayValue(frontendInstance.nodeName)} />
                            </Box>
                        </Stack>
                    </Paper>

                    {/* ---- backend panel ---- */}
                    <Paper
                        variant="outlined"
                        sx={{
                            minHeight: { xs: "auto", md: 470 },
                            p: 2.5,
                            border: "1px solid",
                            borderColor:
                                backendStatus === "ok"
                                    ? "success.light"
                                    : backendStatus === "error"
                                        ? "error.light"
                                        : "divider",
                            borderRadius: 1,
                            boxShadow: "none",
                            display: "flex",
                        }}
                    >
                        <Stack spacing={2} sx={{ width: "100%", height: "100%" }}>
                            <Stack direction="column" spacing={1} alignItems="center">
                                <Image
                                    src="/logos/NestJS.svg"
                                    alt="NestJS"
                                    width={70}
                                    height={70}
                                    style={{ width: "auto", height: "auto", maxHeight: 100 }}
                                />
                                <Typography variant="subtitle2">NestJS</Typography>
                                <Chip
                                    label={chipLabel[backendStatus]}
                                    color={chipConfig[backendStatus].color}
                                    size="medium"
                                    variant="outlined"
                                    icon={chipConfig[backendStatus].icon}
                                />
                            </Stack>

                            {backendInstance && (
                                <Box
                                    sx={{
                                        display: "grid",
                                        gap: 1,
                                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                                    }}
                                >
                                    <DetailItem
                                        label="Hostname"
                                        value={displayValue(backendInstance.hostname)}
                                    />
                                    <DetailItem
                                        label="Pod name"
                                        value={displayValue(backendInstance.podName)}
                                    />
                                    <DetailItem
                                        label="Pod IP"
                                        value={displayValue(backendInstance.podIp)}
                                    />
                                    <DetailItem
                                        label="Node name"
                                        value={displayValue(backendInstance.nodeName)}
                                    />
                                </Box>
                            )}

                            <Stack
                                direction="column"
                                spacing={2}
                                alignItems="center"
                                sx={{ mt: "auto" }}
                            >
                                <Button
                                    variant="contained"
                                    size="medium"
                                    onClick={checkBackend}
                                    disabled={backendStatus === "checking"}
                                >
                                    Check backend
                                </Button>
                                <Typography variant="caption" color="text.secondary">
                                    Last check: {backendLastCheck ?? "Never"}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Paper>

                    {/* ---- db panel ---- */}
                    <Paper
                        variant="outlined"
                        sx={{
                            minHeight: { xs: "auto", md: 470 },
                            p: 2.5,
                            border: "1px solid",
                            borderColor:
                                dbStatus === "ok"
                                    ? "success.light"
                                    : dbStatus === "error"
                                        ? "error.light"
                                        : "divider",
                            borderRadius: 1,
                            boxShadow: "none",
                            opacity: backendStatus === "ok" ? 1 : 0.5,
                            transition: "opacity 0.3s",
                            display: "flex",
                        }}
                    >
                        <Stack spacing={2} sx={{ width: "100%", height: "100%" }}>
                            <Stack direction="column" spacing={1} alignItems="center">
                                <Image
                                    src="/logos/PostgreSQL.svg"
                                    alt="PostgreSQL"
                                    width={70}
                                    height={70}
                                    style={{ width: "auto", height: "auto", maxHeight: 100 }}
                                />
                                <Typography variant="subtitle2">PostgreSQL</Typography>
                                <Chip
                                    label={chipLabel[dbStatus]}
                                    color={chipConfig[dbStatus].color}
                                    size="medium"
                                    variant="outlined"
                                    icon={chipConfig[dbStatus].icon}
                                />
                            </Stack>

                            <Typography variant="caption" color="text.secondary" align="center">
                                RDS Multi-AZ · PostgreSQL 18
                            </Typography>

                            <Stack spacing={1} alignItems="center">
                                <Chip label={`DB state: ${seededLabel}`} color={seededColor} variant="outlined" />
                                <Tooltip title={seedButtonTooltip}>
                                    <span>
                                        <Button
                                            variant="outlined"
                                            color="secondary"
                                            size="medium"
                                            onClick={seedDatabaseOnce}
                                            disabled={seedButtonDisabled}
                                        >
                                            Seed database once
                                        </Button>
                                    </span>
                                </Tooltip>
                                <Typography variant="caption" color="text.secondary">
                                    Seeded at: {dbSeededAt ? new Date(dbSeededAt).toLocaleString() : "Not seeded"}
                                </Typography>
                                {seedActionMessage && (
                                    <Typography
                                        variant="caption"
                                        color={seedActionStatus === "error" ? "error" : "text.secondary"}
                                        align="center"
                                    >
                                        {seedActionMessage}
                                    </Typography>
                                )}
                            </Stack>

                            <Stack
                                direction="column"
                                spacing={2}
                                alignItems="center"
                                sx={{ mt: "auto" }}
                            >
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    size="medium"
                                    onClick={checkDb}
                                    disabled={
                                        backendStatus !== "ok" || dbStatus === "checking"
                                    }
                                >
                                    Check database
                                </Button>
                                <Typography variant="caption" color="text.secondary">
                                    Last check: {dbLastCheck ?? "Never"}
                                </Typography>
                            </Stack>
                        </Stack>
                    </Paper>
                </Box>
            </Stack>
        </Paper>
    );
}
