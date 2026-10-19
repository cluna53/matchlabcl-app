#!/usr/bin/env python3
"""Evaluación de predicciones archivadas de MatchLab. Solo lectura."""
import argparse
import json
from collections import defaultdict
from pathlib import Path

MARKETS = {
    '1X2': ('Victoria local', 'Empate', 'Victoria visitante'),
    'Más/Menos 2,5': ('Más de 2,5 goles', 'Menos de 2,5 goles'),
    'Ambos marcan': ('Ambos marcan · Sí', 'Ambos marcan · No'),
}

def evaluate(records):
    groups = defaultdict(list)
    skipped = 0
    for record in records.values():
        result = record.get('result')
        if not isinstance(result, dict):
            continue
        h, a = result.get('homeGoals'), result.get('awayGoals')
        if not isinstance(h, int) or isinstance(h, bool) or not isinstance(a, int) or isinstance(a, bool) or h < 0 or a < 0:
            skipped += 1
            continue
        preds = record.get('predictions') or {}
        actual = {
            '1X2': 'Victoria local' if h > a else 'Empate' if h == a else 'Victoria visitante',
            'Más/Menos 2,5': 'Más de 2,5 goles' if h + a > 2 else 'Menos de 2,5 goles',
            'Ambos marcan': 'Ambos marcan · Sí' if h > 0 and a > 0 else 'Ambos marcan · No',
        }
        for market, choices in MARKETS.items():
            try:
                ps = [float(preds[k]) for k in choices]
            except (KeyError, ValueError, TypeError):
                skipped += 1
                continue
            if any(not 0 <= p <= 1 for p in ps) or abs(sum(ps) - 1) > 0.01:
                skipped += 1
                continue
            truth = [int(k == actual[market]) for k in choices]
            best = max(range(len(ps)), key=ps.__getitem__)
            # Multiclass Brier normalized by number of classes for comparability.
            brier = sum((p - y) ** 2 for p, y in zip(ps, truth)) / len(ps)
            groups[(record.get('model', 'desconocido'), record.get('league', 'desconocida'), market)].append((int(choices[best] == actual[market]), brier, ps[best], truth[best]))
    return groups, skipped

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('history', nargs='?', default='data/prediction_history.json')
    parser.add_argument('--output', default='data/model_evaluation.json')
    args = parser.parse_args()
    source = Path(args.history)
    if not source.exists():
        raise SystemExit(f'No existe el archivo: {source}')
    doc = json.loads(source.read_text(encoding='utf-8'))
    records = doc.get('records', {})
    if not isinstance(records, dict):
        raise SystemExit('Formato inválido: records debe ser un objeto')
    groups, skipped = evaluate(records)
    rows = []
    for (model, league, market), items in sorted(groups.items()):
        n = len(items)
        rows.append({'model': model, 'league': league, 'market': market, 'matches': n,
                     'correct': sum(x[0] for x in items),
                     'accuracy': round(sum(x[0] for x in items) / n, 4),
                     'brier': round(sum(x[1] for x in items) / n, 4),
                     'mean_confidence': round(sum(x[2] for x in items) / n, 4),
                     'observed_frequency': round(sum(x[3] for x in items) / n, 4)})
    summary = {'total_records': len(records), 'settled_records': sum(isinstance(r.get('result'), dict) for r in records.values()), 'skipped_market_evaluations': skipped, 'note': 'Brier multiclase normalizado por número de opciones. Muestras pequeñas: no interpretar como calibración concluyente.', 'by_model_league_market': rows}
    target = Path(args.output)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Registros: {summary["total_records"]} | Evaluados: {summary["settled_records"]} | Evaluaciones omitidas: {skipped}')
    for row in rows:
        print(f'{row["model"]} | {row["league"]} | {row["market"]}: {row["correct"]}/{row["matches"]} aciertos, Brier {row["brier"]:.4f}')
    print(f'Informe: {target}')

if __name__ == '__main__':
    main()
