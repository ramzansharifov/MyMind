import { StudyMaterial, StudyNode } from '../../types';
import { getMaterialOutgoingLinks, getMaterialBacklinks } from '../../utils/internalLinks';

interface StudyLinksViewProps {
  material: StudyMaterial;
  nodes: StudyNode[];
  allMaterials: StudyMaterial[];
  onOpenMaterial: (nodeId: string) => void;
}

export function StudyLinksView({
  material,
  nodes,
  allMaterials,
  onOpenMaterial,
}: StudyLinksViewProps) {
  const outgoingLinks = getMaterialOutgoingLinks(material, nodes);
  const currentNode = nodes.find(n => n.id === material.nodeId);
  const backlinks = currentNode ? getMaterialBacklinks(currentNode, allMaterials, nodes) : [];

  return (
    <div className="study-links-view glass-panel">
      <section>
        <h2>Outgoing links</h2>
        {outgoingLinks.length === 0 ? <p className="study-muted">No internal links yet. Use [[Material title]].</p> : (
          <div className="study-link-list">
            {outgoingLinks.map((link) => (
              <button
                className={link.found ? 'valid' : 'broken'}
                type="button"
                key={link.raw}
                disabled={!link.found}
                onClick={() => link.node && onOpenMaterial(link.node.id)}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2>Backlinks</h2>
        {backlinks.length === 0 ? <p className="study-muted">No backlinks found.</p> : backlinks.map((item) => (
          <button className="study-link-card" type="button" key={item.id} onClick={() => onOpenMaterial(item.nodeId)}>
            <strong>{item.title}</strong>
            <span>{item.blocks.length} blocks</span>
          </button>
        ))}
      </section>
    </div>
  );
}
