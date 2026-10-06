<script setup lang="ts">
import type { MeasurementSystem } from '../../core/units';
import type { Risk } from '../../core/models';
import { formatRiskMessage } from '../risk-display';
defineProps<{ risks: Risk[]; unit: MeasurementSystem }>();
</script>

<template><aside class="risk-panel"><div class="section-title"><div><span>RISK SCAN</span><h2>装箱风险</h2></div><b>{{ risks.filter(r => r.severity !== 'info').length }}</b></div><article v-for="risk in risks" :key="risk.id" :class="['risk-row', risk.severity]"><i>{{ risk.severity === 'critical' ? '!' : risk.severity === 'warning' ? '△' : '✓' }}</i><div><strong>{{ risk.title }}</strong><p>{{ formatRiskMessage(risk, unit) }}</p></div></article></aside></template>
