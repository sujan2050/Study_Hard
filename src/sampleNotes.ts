export interface SampleNote {
  id: string;
  title: string;
  description: string;
  content: string;
}

export const SAMPLE_NOTES: SampleNote[] = [
  {
    id: 'cognitive-science',
    title: 'Cognitive Science: The Mechanics of Memory and Retrieval',
    description: 'Active recall, the Ebbinghaus forgetting curve, and the spacing effect.',
    content: `Active recall is a learning principle where the learner deliberately retrieves information from memory rather than passively re-reading it. When a concept is actively retrieved, the neural pathways associated with that memory trace are reinforced through synaptic plasticity.

The forgetting curve, originally formulated by Hermann Ebbinghaus, demonstrates that humans halve their memory of newly learned knowledge within a matter of days unless the material is deliberately reviewed. Without conscious rehearsal, memory retention drops exponentially along a mathematical decay curve.

Spaced repetition is an evidence-based learning technique that incorporates increasing intervals of time between subsequent review sessions. By reviewing a concept right at the threshold of forgetting, the memory is reconsolidated into long-term storage far more efficiently than cramming.`
  },
  {
    id: 'cellular-respiration',
    title: 'Cellular Respiration and ATP Synthesis',
    description: 'Glycolysis, the citric acid cycle, and oxidative phosphorylation in eukaryotic cells.',
    content: `Cellular respiration is the metabolic pathway through which organisms break down glucose molecules to produce adenosine triphosphate, the universal energy currency of biological cells. The overarching process is categorized into three major phases: glycolysis, the citric acid cycle, and oxidative phosphorylation.

Glycolysis occurs in the cytosol of the cell and converts one six-carbon glucose molecule into two three-carbon pyruvate molecules without requiring oxygen. This initial anaerobic phase produces a net yield of two ATP molecules and two NADH molecules through substrate-level phosphorylation.

Oxidative phosphorylation takes place across the inner mitochondrial membrane and generates the vast majority of cellular ATP. During this stage, electron transport chains create an electrochemical proton gradient that drives ATP synthase, producing approximately thirty to thirty-two ATP molecules per glucose molecule.`
  },
  {
    id: 'roman-architecture',
    title: 'Roman Engineering and Pozzolanic Concrete',
    description: 'How Roman hydraulic concrete and the true arch revolutionized ancient architecture.',
    content: `Roman concrete, or opus caementicium, was an ancient material that enabled Roman builders to construct unprecedented monuments such as the Pantheon dome and the Colosseum. Unlike modern Portland cement, Roman concrete was composed of slaked lime combined with volcanic ash known as pozzolana.

Pozzolana is a siliceous volcanic ash quarried near Pozzuoli that reacts chemically with calcium hydroxide and water to form durable aluminosilicate hydrate compounds. This unique chemical reaction allowed Roman structures to cure and harden even underwater, revolutionizing maritime harbor and aqueduct construction.

The Roman arch is an engineering triumph that diverts gravitational compressive loads downward and outward along curved masonry blocks into solid abutments. By utilizing keystone-locked arches and barrel vaults, Roman architects bridged vast river valleys with multi-tiered aqueducts that transported millions of gallons of fresh water daily.`
  }
];
