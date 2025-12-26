/**
 * UI Block renderer component.
 * Renders different types of generative UI blocks.
 */
'use client';

import { motion } from 'framer-motion';
import type { UIBlock, InfoCardData, TableData, ChartData } from '@/types';
import { InfoCard } from './InfoCard';
import { DataTable } from './DataTable';
import { Chart } from './Chart';

interface UIBlockRendererProps {
  block: UIBlock;
}

export function UIBlockRenderer({ block }: UIBlockRendererProps) {
  const variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {block.type === 'info_card' && (
        <InfoCard data={block.data as InfoCardData} />
      )}
      {block.type === 'table' && (
        <DataTable data={block.data as TableData} />
      )}
      {block.type === 'chart' && (
        <Chart data={block.data as ChartData} />
      )}
    </motion.div>
  );
}
