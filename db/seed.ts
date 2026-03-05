import { db, documentos } from './index';


const documentosSeed = [
    {
        codigo: 'RES-2024-001',
        titulo: 'Resolución de Nombramiento',
        descripcion: 'Resolución para nombramiento de personal administrativo',
        tipo: 'resolucion' as const,
        estado: 'aprobado' as const,
        fechaExpedicion: '2024-01-15',
        numeroFolios: 3,
        esConfidencial: false,
        prioridad: 'alta' as const,
        etiquetas: ['rrhh', 'nombramiento'],
    },
    {
        codigo: 'CIR-2024-005',
        titulo: 'Circular Informativa - Horarios',
        descripcion: 'Información sobre nuevos horarios de atención',
        tipo: 'circular' as const,
        estado: 'borrador' as const,
        fechaExpedicion: '2024-02-01',
        numeroFolios: 1,
        esConfidencial: false,
        prioridad: 'media' as const,
        etiquetas: ['informativo', 'horarios'],
    },
    {
        codigo: 'MEM-2024-012',
        titulo: 'Memorando Interno - Presupuesto Q1',
        descripcion: 'Comunicación interna sobre ejecución presupuestal',
        tipo: 'memorando' as const,
        estado: 'revision' as const,
        fechaExpedicion: '2024-03-10',
        fechaVencimiento: '2024-03-31',
        numeroFolios: 5,
        esConfidencial: true,
        prioridad: 'urgente' as const,
        etiquetas: ['presupuesto', 'confidencial', 'q1'],
    },
    {
        codigo: 'ACT-2024-003',
        titulo: 'Acta de Reunión - Comité Directivo',
        descripcion: 'Acta de la reunión mensual del comité directivo',
        tipo: 'acta' as const,
        estado: 'aprobado' as const,
        fechaExpedicion: '2024-02-20',
        numeroFolios: 8,
        esConfidencial: false,
        prioridad: 'media' as const,
        etiquetas: ['reunion', 'comite'],
    },
    {
        codigo: 'INF-2024-007',
        titulo: 'Informe de Gestión Trimestral',
        descripcion: 'Informe detallado de la gestión del primer trimestre',
        tipo: 'informe' as const,
        estado: 'archivado' as const,
        fechaExpedicion: '2024-04-05',
        numeroFolios: 25,
        esConfidencial: false,
        prioridad: 'baja' as const,
        etiquetas: ['informe', 'gestion', 'trimestral'],
    },
];

async function seed() {
    console.log('🌱 Iniciando seed de documentos...');

    try {
        // Limpiar tabla existente (opcional)
        await db.delete(documentos);
        console.log('   Tabla limpiada');

        // Insertar documentos de prueba
        const inserted = await db.insert(documentos).values(documentosSeed).returning();
        console.log(`   ${inserted.length} documentos insertados`);

        console.log('✅ Seed completado exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error en seed:', error);
        process.exit(1);
    }
}

seed();