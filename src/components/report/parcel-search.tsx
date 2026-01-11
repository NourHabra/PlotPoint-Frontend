"use client";

import React from "react";

import { Loader2, ChevronsUpDown, Check, X, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cadastralApi } from "@/lib/api";

import { ParcelDetailsDisplay } from "./parcel-search-display";

interface RegionOption {
    vilCode: number;
    distCode: number;
    name: string;
}

interface ParcelSearchProps {
    // Province code to name mapping
    eparchiaCodeToName: Record<string, string>;

    // Form field values
    eparchia: string;
    dimos: string;
    enoria: string;
    fyllo: string;
    sxedio: string;
    tmima: string;
    arithmosTemaxiou: string;

    // Dropdown options
    dimosOptions: RegionOption[];
    enoriaOptions: Array<{ qrtrCode: number; qrtrName: string | null }>;
    fylloOptions: string[];
    sxedioOptions: string[];
    tmimaOptions: string[];

    // Dropdown open states
    dimosOpen: boolean;
    eparchiaOpen: boolean;

    // Loading states
    loadingRegions: boolean;
    loadingQrtrCode: boolean;
    loadingSheets: boolean;
    loadingPlans: boolean;
    loadingSections: boolean;
    loadingParcelQuery: boolean;

    // Selected codes
    selectedRegionCodes: { vilCode: number; distCode: number } | null;
    qrtrCode: number | null;

    // Parcel details
    parcelDetails: any;
    reportId: string | null;

    // Callbacks
    onParcelFound?: (data: {
        sbpiIdNo: number;
        parcelDetails: any;
        searchParams: {
            distCode: number;
            vilCode: number;
            qrtrCode: number;
            sheet: string;
            planNbr: string;
            parcelNbr: string;
        };
    }) => void;

    // Setters
    setEparchia: (value: string) => void;
    setDimos: (value: string) => void;
    setEnoria: (value: string) => void;
    setFyllo: (value: string) => void;
    setSxedio: (value: string) => void;
    setTmima: (value: string) => void;
    setArithmosTemaxiou: (value: string) => void;
    setDimosOpen: (value: boolean) => void;
    setEparchiaOpen: (value: boolean) => void;
    setSelectedRegionCodes: (value: { vilCode: number; distCode: number } | null) => void;
    setQrtrCode: (value: number | null) => void;
    setSbpiIdNo: (value: number | null) => void;
    setLoadingParcelQuery: (value: boolean) => void;
    setParcelDetails: (value: any) => void;

    // Clear functions
    clearEparchia: () => void;
    clearDimos: () => void;
    clearEnoria: () => void;
    clearFyllo: () => void;
    clearSxedio: () => void;
    clearTmima: () => void;
    clearAllParcelData: () => void;
}

export function ParcelSearch(props: ParcelSearchProps) {
    const {
        eparchiaCodeToName,
        eparchia,
        dimos,
        enoria,
        fyllo,
        sxedio,
        tmima,
        arithmosTemaxiou,
        dimosOptions,
        enoriaOptions,
        fylloOptions,
        sxedioOptions,
        tmimaOptions,
        dimosOpen,
        eparchiaOpen,
        loadingRegions,
        loadingQrtrCode,
        loadingSheets,
        loadingPlans,
        loadingSections,
        loadingParcelQuery,
        selectedRegionCodes,
        qrtrCode,
        parcelDetails,
        reportId,
        onParcelFound,
        setEparchia,
        setDimos,
        setEnoria,
        setFyllo,
        setSxedio,
        setTmima,
        setArithmosTemaxiou,
        setDimosOpen,
        setEparchiaOpen,
        setSelectedRegionCodes,
        setQrtrCode,
        setSbpiIdNo,
        setLoadingParcelQuery,
        setParcelDetails,
        clearEparchia,
        clearDimos,
        clearEnoria,
        clearFyllo,
        clearSxedio,
        clearTmima,
        clearAllParcelData,
    } = props;

    const eparchiaOptions = Object.entries(eparchiaCodeToName).map(([code, name]) => ({
        code,
        name
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle>Parcel Search</CardTitle>
                <CardDescription>
                    Search for a parcel by entering the cadastral information.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: All form fields */}
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <Label htmlFor="eparchia">Επαρχία (Province)</Label>
                            <Popover open={eparchiaOpen} onOpenChange={setEparchiaOpen}>
                                <PopoverTrigger asChild>
                                    <div className="relative">
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={eparchiaOpen}
                                            className="w-full justify-between bg-gray-100"
                                        >
                                            {eparchia
                                                ? eparchiaOptions.find((option) => option.code === eparchia)?.name
                                                : "Επαρχία..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                        {eparchia && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearEparchia();
                                                }}
                                            >
                                                <X className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        )}
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Αναζήτηση επαρχίας..." />
                                        <CommandList>
                                            <CommandEmpty>Δεν βρέθηκε επαρχία.</CommandEmpty>
                                            <CommandGroup>
                                                {eparchiaOptions.map((option) => (
                                                    <CommandItem
                                                        key={option.code}
                                                        value={option.name}
                                                        onSelect={() => {
                                                            setEparchia(option.code === eparchia ? "" : option.code);
                                                            setEparchiaOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${eparchia === option.code ? "opacity-100" : "opacity-0"
                                                                }`}
                                                        />
                                                        {option.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="dimos">Περιοχή (Region)</Label>
                            <Popover open={dimosOpen} onOpenChange={setDimosOpen}>
                                <PopoverTrigger asChild>
                                    <div className="relative">
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={dimosOpen}
                                            className={`w-full bg-gray-100 ${loadingRegions ? 'justify-start' : 'justify-between'}`}
                                            disabled={!eparchia || loadingRegions}
                                        >
                                            {loadingRegions ? (
                                                <div className="flex items-center">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    <span>Φόρτωση...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    {dimos
                                                        ? dimosOptions.find((option) => option.name === dimos)?.name
                                                        : "Περιοχή..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </>
                                            )}
                                        </Button>
                                        {dimos && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent z-10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    clearDimos();
                                                }}
                                            >
                                                <X className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                        )}
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Αναζήτηση περιοχής..." />
                                        <CommandList>
                                            <CommandEmpty>Δεν βρέθηκε περιοχή.</CommandEmpty>
                                            <CommandGroup>
                                                {dimosOptions.map((option) => (
                                                    <CommandItem
                                                        key={`${option.vilCode}-${option.distCode}`}
                                                        value={option.name}
                                                        onSelect={() => {
                                                            const newDimos = option.name === dimos ? "" : option.name;
                                                            const newCodes = newDimos ? {
                                                                vilCode: option.vilCode,
                                                                distCode: option.distCode
                                                            } : null;
                                                            console.log('Region selected:', { newDimos, newCodes });
                                                            setDimos(newDimos);
                                                            setSelectedRegionCodes(newCodes);
                                                            setDimosOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${dimos === option.name ? "opacity-100" : "opacity-0"
                                                                }`}
                                                        />
                                                        {option.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="enoria">Ενορία (Quarter)</Label>
                            <div className="relative">
                                <Select
                                    value={enoria}
                                    onValueChange={(value) => {
                                        setEnoria(value);
                                        const selected = enoriaOptions.find(opt => String(opt.qrtrCode) === value);
                                        if (selected) {
                                            setQrtrCode(selected.qrtrCode);
                                        }
                                    }}
                                    disabled={loadingQrtrCode || enoriaOptions.length === 0 || enoriaOptions.length === 1}
                                >
                                    <SelectTrigger id="enoria" className="bg-gray-100 w-full">
                                        {loadingQrtrCode ? (
                                            <div className="flex items-center w-full">
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                <span>Φόρτωση...</span>
                                            </div>
                                        ) : (
                                            <SelectValue placeholder="Ενορία...">
                                                {enoria && enoriaOptions.find(opt => String(opt.qrtrCode) === enoria)
                                                    ? `${enoria}${enoriaOptions.find(opt => String(opt.qrtrCode) === enoria)?.qrtrName ? ` - ${enoriaOptions.find(opt => String(opt.qrtrCode) === enoria)?.qrtrName}` : ''}`
                                                    : undefined
                                                }
                                            </SelectValue>
                                        )}
                                    </SelectTrigger>
                                    <SelectContent>
                                        {enoriaOptions.map((option) => (
                                            <SelectItem key={option.qrtrCode} value={String(option.qrtrCode)}>
                                                {option.qrtrCode}{option.qrtrName ? ` - ${option.qrtrName}` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {enoria && enoriaOptions.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearEnoria();
                                        }}
                                    >
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Sheet, Plan, and Section in one row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                            <div className="space-y-3 w-full">
                                <Label htmlFor="fyllo">Φύλλο (Sheet)</Label>
                                <div className="relative w-full">
                                    <Select
                                        value={fyllo}
                                        onValueChange={props.setFyllo}
                                        disabled={!dimos || loadingSheets}
                                    >
                                        <SelectTrigger id="fyllo" className="bg-gray-100 w-full">
                                            {loadingSheets ? (
                                                <div className="flex items-center w-full">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    <span>Φόρτωση...</span>
                                                </div>
                                            ) : (
                                                <SelectValue placeholder="Φύλλο..." />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {loadingSheets ? (
                                                <div className="flex items-center justify-center p-4">
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    <span className="text-sm text-muted-foreground">Φόρτωση...</span>
                                                </div>
                                            ) : (
                                                fylloOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {fyllo && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearFyllo();
                                            }}
                                        >
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 w-full">
                                <Label htmlFor="sxedio">Σχέδιο (Plan)</Label>
                                <div className="relative w-full">
                                    <Select
                                        value={sxedio}
                                        onValueChange={props.setSxedio}
                                        disabled={!fyllo || loadingPlans}
                                    >
                                        <SelectTrigger id="sxedio" className="bg-gray-100 w-full">
                                            {loadingPlans ? (
                                                <div className="flex items-center w-full">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    <span>Φόρτωση...</span>
                                                </div>
                                            ) : (
                                                <SelectValue placeholder="Σχέδιο..." />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {loadingPlans ? (
                                                <div className="flex items-center justify-center p-4">
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    <span className="text-sm text-muted-foreground">Φόρτωση...</span>
                                                </div>
                                            ) : (
                                                sxedioOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {sxedio && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearSxedio();
                                            }}
                                        >
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3 w-full">
                                <Label htmlFor="tmima">Τμήμα (Section)</Label>
                                <div className="relative w-full">
                                    <Select
                                        value={tmima}
                                        onValueChange={setTmima}
                                        disabled={!sxedio || loadingSections || tmimaOptions.length === 0 || tmimaOptions.length === 1}
                                    >
                                        <SelectTrigger id="tmima" className="bg-gray-100 w-full">
                                            {loadingSections ? (
                                                <div className="flex items-center w-full">
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    <span>Φόρτωση...</span>
                                                </div>
                                            ) : (
                                                <SelectValue placeholder="Τμήμα..." />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent>
                                            {loadingSections ? (
                                                <div className="flex items-center justify-center p-4">
                                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    <span className="text-sm text-muted-foreground">Φόρτωση...</span>
                                                </div>
                                            ) : (
                                                tmimaOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {tmima && tmimaOptions.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearTmima();
                                            }}
                                        >
                                            <X className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="arithmos-temaxiou">Αριθμός Τεμαχίου (Parcel Number)</Label>
                            <div className="relative">
                                <Input
                                    id="arithmos-temaxiou"
                                    type="text"
                                    placeholder="Αριθμός Τεμαχίου..."
                                    value={arithmosTemaxiou}
                                    onChange={(e) => setArithmosTemaxiou(e.target.value)}
                                    className="bg-gray-100 pr-8"
                                />
                                {arithmosTemaxiou && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                                        onClick={() => setArithmosTemaxiou("")}
                                    >
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Find Button */}
                        <div className="flex justify-start gap-2 pt-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span>
                                            <Button
                                                onClick={async () => {
                                                    // Validate required fields
                                                    if (!selectedRegionCodes?.distCode || !selectedRegionCodes?.vilCode || !fyllo || !sxedio || !arithmosTemaxiou) {
                                                        toast.error('Please fill in all required fields');
                                                        return;
                                                    }

                                                    setLoadingParcelQuery(true);
                                                    try {
                                                        const distCode = selectedRegionCodes.distCode;
                                                        const vilCode = selectedRegionCodes.vilCode;
                                                        const qrtrCodeValue = qrtrCode !== null && qrtrCode !== undefined ? qrtrCode : 0;
                                                        const sheet = fyllo;
                                                        const planNbr = sxedio;
                                                        const parcelNbr = arithmosTemaxiou;

                                                        console.log('Request Parameters:', {
                                                            distCode,
                                                            vilCode,
                                                            qrtrCodeValue,
                                                            sheet,
                                                            planNbr,
                                                            parcelNbr
                                                        });

                                                        // Make the API request through backend
                                                        const data = await cadastralApi.queryParcel({
                                                            distCode,
                                                            vilCode,
                                                            qrtrCode: qrtrCodeValue,
                                                            sheet,
                                                            planNbr,
                                                            parcelNbr
                                                        });

                                                        console.log('API Response Data:', data);

                                                        // Extract SBPI_ID_NO from the response
                                                        const sbpiId = data?.sbpiIdNo;
                                                        if (sbpiId !== undefined && sbpiId !== null) {
                                                            setSbpiIdNo(sbpiId);
                                                            console.log('SBPI_ID_NO:', sbpiId);
                                                        }

                                                        // Store parcel details
                                                        if (data?.parcelDetails) {
                                                            console.log('Parcel Details received:', data.parcelDetails);
                                                            console.log('Parcel Details type:', typeof data.parcelDetails);
                                                            console.log('Is Array?', Array.isArray(data.parcelDetails));
                                                            console.log('Has PrPropertyTypeNameEl?', data.parcelDetails.PrPropertyTypeNameEl);
                                                            setParcelDetails(data.parcelDetails);
                                                            toast.success('Parcel found successfully!');

                                                            // Call callback to save parcel data to report
                                                            if (onParcelFound && sbpiId && data.searchParams) {
                                                                onParcelFound({
                                                                    sbpiIdNo: sbpiId,
                                                                    parcelDetails: data.parcelDetails,
                                                                    searchParams: data.searchParams,
                                                                });
                                                            }
                                                        } else {
                                                            setParcelDetails(null);
                                                            console.warn('Parcel details not found in response');
                                                            if (sbpiId) {
                                                                toast.warning('Parcel found but detailed information is not available');
                                                            } else {
                                                                toast.error('Parcel not found. Please verify the entered information.');
                                                            }
                                                        }
                                                    } catch (error) {
                                                        console.error('Error making API request:', error);
                                                        toast.error(`Failed to query: ${error instanceof Error ? error.message : 'Unknown error'}`);
                                                    } finally {
                                                        setLoadingParcelQuery(false);
                                                    }
                                                }}
                                                disabled={!eparchia || !dimos || !fyllo || !sxedio || !arithmosTemaxiou || !selectedRegionCodes?.distCode || !selectedRegionCodes?.vilCode || loadingParcelQuery}
                                            >
                                                {loadingParcelQuery ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Searching...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Search className="mr-2 h-4 w-4" />
                                                        Find
                                                    </>
                                                )}
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    {(!eparchia || !dimos || !fyllo || !sxedio || !arithmosTemaxiou) && (
                                        <TooltipContent>
                                            <p>Please fill in all required fields</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    {/* Right Column: Reserved for API information display */}
                    <div className="space-y-4">
                        <ParcelDetailsDisplay details={parcelDetails} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

