import useRaceStore from '../store/useRaceStore'

const CATEGORIES = ['ALL', 'HYPERCAR', 'LMP2', 'LMGT3']

export default function CategoryFilter() {
  const active = useRaceStore((s) => s.categoryFilter)
  const set = useRaceStore((s) => s.setCategoryFilter)

  return (
    <div className="category-filter">
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          className={`cat-btn${active === cat ? ' active' : ''}`}
          onClick={() => set(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  )
}
